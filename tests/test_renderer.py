from changelog_gen.parser import Commit
from changelog_gen.renderer import render


def test_render_lists_commits():
    out = render([Commit("feat", "api", "add x"), Commit("fix", None, "bug")], "1.0.0")
    assert out == "## 1.0.0\n\n- **api**: add x\n- bug\n"


def test_render_breaking_section():
    out = render([Commit("feat", "api", "drop v1", breaking=True), Commit("fix", None, "bug")], "2.0.0")
    assert out == (
        "## 2.0.0\n\n"
        "### Breaking Changes\n\n- **api**: drop v1\n\n"
        "### Changes\n\n- bug\n"
    )


def test_render_only_breaking_has_no_changes_heading():
    out = render([Commit("feat", None, "drop v1", breaking=True)], "2.0.0")
    assert out == "## 2.0.0\n\n### Breaking Changes\n\n- drop v1\n\n"
    assert "### Changes" not in out


def test_render_without_breaking_has_no_breaking_section():
    assert "Breaking" not in render([Commit("fix", None, "bug")])
