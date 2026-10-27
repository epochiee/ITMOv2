import subprocess
import sys

import pytest

from changelog_gen import cli


def _git(repo, *args):
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


def test_read_messages_keeps_body(tmp_path, monkeypatch):
    _git(tmp_path, "init", "-q")
    _git(tmp_path, "config", "user.email", "t@example.com")
    _git(tmp_path, "config", "user.name", "t")
    _git(tmp_path, "commit", "-q", "--allow-empty", "-m", "fix: bug")
    _git(tmp_path, "commit", "-q", "--allow-empty", "-m", "feat: new\n\nBREAKING CHANGE: gone")
    monkeypatch.chdir(tmp_path)

    messages = cli.read_messages()

    assert messages == ["feat: new\n\nBREAKING CHANGE: gone", "fix: bug"]


def _repo(path, *messages):
    _git(path, "init", "-q")
    _git(path, "config", "user.email", "t@example.com")
    _git(path, "config", "user.name", "t")
    for message in messages:
        _git(path, "commit", "-q", "--allow-empty", "-m", message)


HISTORY = ("fix: bug", "update stuff", "docs: readme", "feat(api): add x", "refactor(core)!: drop v1")


def test_main_without_arguments_keeps_output(tmp_path, monkeypatch, capsys):
    # Characterization test: written before the argparse refactoring, must pass unchanged after it.
    _repo(tmp_path, *HISTORY)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(sys, "argv", ["changelog-gen"])

    assert cli.main() == 0

    out, err = capsys.readouterr()
    assert out == (
        "## Unreleased\n\n"
        "### Breaking Changes\n\n- **core**: drop v1\n\n"
        "### Features\n\n- **api**: add x\n\n"
        "### Fixes\n\n- bug\n\n"
        "### Other\n\n- readme\n"
    )
    assert err == "skip: not a Conventional Commit header: 'update stuff'\n"


def _run(tmp_path, monkeypatch, capsys, *argv, history=HISTORY):
    _repo(tmp_path, *history)
    monkeypatch.chdir(tmp_path)
    code = cli.main(list(argv))
    out, err = capsys.readouterr()
    return code, out, err


def test_main_with_range_reads_only_that_range(tmp_path, monkeypatch, capsys):
    code, out, _ = _run(tmp_path, monkeypatch, capsys, "HEAD~2..HEAD")

    assert code == 0
    assert "add x" in out and "drop v1" in out
    assert "bug" not in out and "readme" not in out


@pytest.mark.parametrize(
    "argv", [["--foo"], ["--no-merges"], ["--type", "feat"], ["HEAD~1", "HEAD"]]
)
def test_usage_errors_exit_with_code_2(argv, capsys):
    with pytest.raises(SystemExit) as excinfo:
        cli.main(argv)

    out, err = capsys.readouterr()
    assert excinfo.value.code == 2
    assert out == ""
    assert "usage:" in err


def test_usage_error_has_no_traceback(tmp_path):
    result = subprocess.run(
        [sys.executable, "-m", "changelog_gen.cli", "--foo"],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 2
    assert "usage:" in result.stderr
    assert "Traceback" not in result.stderr


def _no_git(*args, **kwargs):
    raise AssertionError("git must not be called")


@pytest.mark.parametrize(
    ("value", "shown"),
    [("feat,feature", "'feature'"), ("", "''"), ("feat,", "''"), ("FEAT", "'FEAT'")],
)
def test_invalid_types_fail_before_reading_git(value, shown, monkeypatch, capsys):
    monkeypatch.setattr(cli, "read_messages", _no_git)

    with pytest.raises(SystemExit) as excinfo:
        cli.main(["--types", value])

    out, err = capsys.readouterr()
    assert excinfo.value.code == 2
    assert out == ""
    assert shown in err
    assert "feat, fix, docs, style, refactor, perf, test, build, ci, chore" in err


def test_types_filter_keeps_only_selected_types(tmp_path, monkeypatch, capsys):
    code, out, err = _run(tmp_path, monkeypatch, capsys, "--types", "feat,fix")

    assert code == 0
    assert "- **api**: add x" in out and "- bug" in out
    assert "readme" not in out
    assert err.startswith("skip:")


@pytest.mark.parametrize("argv", [["--types", " feat , fix "], ["--types", "feat", "--types", "fix"]])
def test_types_spaces_and_repeats_match_comma_list(argv, tmp_path, monkeypatch, capsys):
    _, expected, _ = _run(tmp_path, monkeypatch, capsys, "--types", "feat,fix")

    assert cli.main(argv) == 0
    assert capsys.readouterr().out == expected


@pytest.mark.parametrize(
    "argv", [["--types", "docs", "HEAD~3..HEAD"], ["HEAD~3..HEAD", "--types", "docs"]]
)
def test_types_with_range_in_any_order(argv, tmp_path, monkeypatch, capsys):
    code, out, _ = _run(tmp_path, monkeypatch, capsys, *argv)

    assert code == 0
    assert out == "## Unreleased\n\n### Breaking Changes\n\n- **core**: drop v1\n\n### Other\n\n- readme\n"


def test_breaking_commit_survives_type_filter(tmp_path, monkeypatch, capsys):
    _, out, _ = _run(tmp_path, monkeypatch, capsys, "--types", "feat")

    assert "### Breaking Changes\n\n- **core**: drop v1\n" in out
    assert "- **api**: add x" in out
    assert "bug" not in out


def test_types_filter_with_no_matches_prints_only_header(tmp_path, monkeypatch, capsys):
    code, out, _ = _run(tmp_path, monkeypatch, capsys, "--types", "feat", history=("docs: readme",))

    assert code == 0
    assert out == "## Unreleased\n"


def test_help_describes_types(capsys):
    with pytest.raises(SystemExit) as excinfo:
        cli.main(["--help"])

    out = " ".join(capsys.readouterr().out.split())  # argparse wraps help lines
    assert excinfo.value.code == 0
    assert "--types" in out
    assert "breaking changes are always included" in out
    assert "feat, fix, docs" in out
