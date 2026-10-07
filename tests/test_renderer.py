from changelog_gen.parser import Commit
from changelog_gen.renderer import render


def test_render_lists_commits():
    out = render([Commit("feat", "api", "add x"), Commit("fix", None, "bug")], "1.0.0")
    assert out == "## 1.0.0\n\n- **api**: add x\n- bug\n"
