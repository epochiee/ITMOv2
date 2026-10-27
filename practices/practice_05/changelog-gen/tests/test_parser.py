import pytest

from changelog_gen.parser import CommitParseError, parse_commit


def test_simple():
    c = parse_commit("feat: add thing")
    assert (c.type, c.scope, c.description, c.breaking) == ("feat", None, "add thing", False)


def test_scope_and_bang():
    c = parse_commit("fix(api)!: drop v1")
    assert c.scope == "api" and c.breaking


@pytest.mark.parametrize("footer", ["BREAKING CHANGE: v1 removed", "BREAKING-CHANGE: v1 removed"])
def test_breaking_change_footer(footer):
    c = parse_commit(f"feat(api): new api\n\nlong body\n\n{footer}")
    assert c.breaking


def test_breaking_marker_mid_line_is_ignored():
    assert not parse_commit("feat: add thing\n\nthis is not a BREAKING CHANGE: footer").breaking


def test_breaking_marker_in_header_is_ignored():
    assert not parse_commit("fix: handle BREAKING CHANGE: text").breaking


@pytest.mark.parametrize("bad", ["update stuff", "", "feat:no space", "wip: x"])
def test_invalid(bad):
    with pytest.raises(CommitParseError):
        parse_commit(bad)
