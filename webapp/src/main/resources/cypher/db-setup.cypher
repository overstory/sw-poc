
// Setup constraints

CREATE CONSTRAINT ON (f:Film) ASSERT f.url IS UNIQUE
// TX-SPLIT ---------------------------------
CREATE CONSTRAINT ON (c:Character) ASSERT c.url IS UNIQUE
// TX-SPLIT ---------------------------------
CREATE CONSTRAINT ON (p:Planet) ASSERT p.url IS UNIQUE
// TX-SPLIT ---------------------------------
CREATE CONSTRAINT ON (s:Species) ASSERT s.url IS UNIQUE
// TX-SPLIT ---------------------------------
CREATE CONSTRAINT ON (sh:Starship) ASSERT sh.url IS UNIQUE
// TX-SPLIT ---------------------------------
CREATE CONSTRAINT ON (v:Vehicle) ASSERT v.url IS UNIQUE
// TX-SPLIT ---------------------------------
CREATE CONSTRAINT ON (a:Actor) ASSERT a.movieDbId IS UNIQUE

