import pytest

from changelog_gen.parser import CommitParseError, parse_commit


def test_simple():
    c = parse_commit("feat: add thing")
    assert (c.type, c.scope, c.description, c.breaking) == ("feat", None, "add thing", False)


def test_scope_and_bang():
    c = parse_commit("fix(api)!: drop v1")
    assert c.scope == "api" and c.breaking


@pytest.mark.parametrize("bad", ["update stuff", "", "feat:no space", "wip: x"])
def test_invalid(bad):
    with pytest.raises(CommitParseError):
        parse_commit(bad)
