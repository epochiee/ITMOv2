import subprocess

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
