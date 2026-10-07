from changelog_gen.parser import Commit
from changelog_gen.renderer import render


def test_render_groups_commits_by_type():
    out = render(
        [Commit("fix", None, "bug"), Commit("feat", "api", "add x"), Commit("docs", None, "readme")],
        "1.0.0",
    )
    assert out == (
        "## 1.0.0\n\n"
        "### Features\n\n- **api**: add x\n\n"
        "### Fixes\n\n- bug\n\n"
        "### Other\n\n- readme\n"
    )


def test_render_skips_empty_sections():
    out = render([Commit("fix", None, "bug")], "1.0.0")
    assert out == "## 1.0.0\n\n### Fixes\n\n- bug\n"
    assert "Features" not in out
    assert "Other" not in out


def test_render_other_collects_non_feat_fix_types():
    out = render([Commit("chore", None, "deps"), Commit("refactor", "core", "tidy")])
    assert out == "## Unreleased\n\n### Other\n\n- deps\n- **core**: tidy\n"


def test_render_keeps_order_within_section():
    out = render([Commit("feat", None, "first"), Commit("feat", None, "second")], "2.0.0")
    assert out.index("first") < out.index("second")


def test_render_empty_list_has_only_header():
    assert render([], "1.0.0") == "## 1.0.0\n"


def test_render_breaking_section_comes_first():
    out = render(
        [Commit("fix", None, "bug"), Commit("feat", "api", "drop v1", breaking=True)], "2.0.0"
    )
    assert out == (
        "## 2.0.0\n\n"
        "### Breaking Changes\n\n- **api**: drop v1\n\n"
        "### Fixes\n\n- bug\n"
    )


def test_render_breaking_commit_is_not_duplicated_in_type_section():
    out = render([Commit("feat", None, "drop v1", breaking=True)], "2.0.0")
    assert out == "## 2.0.0\n\n### Breaking Changes\n\n- drop v1\n"
    assert "Features" not in out


def test_render_without_breaking_has_no_breaking_section():
    assert "Breaking" not in render([Commit("fix", None, "bug")])
