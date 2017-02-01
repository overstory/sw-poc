CREATE CONSTRAINT ON (act:Actor) ASSERT act.id IS UNIQUE;
// TX-SPLIT ---------------------------------
//CREATE CONSTRAINT ON (als:Alias) ASSERT als.name IS UNIQUE;
//XXXX TX-SPLIT ---------------------------------
// The comment prefix '// TX-SPLIT ' is magic to create multiple transaction calls.  You can leave an empty transaction, it will cause an error


WITH {json} AS moviedb
UNWIND moviedb.actors AS a
// Actor (NODE {id: int})
// Actor <-[:PORTRAYED_BY]- Character
// Actor -[:APPEARS_IN]-> Film
// Actor -[:ALSO_KNOWN_AS]-> (Alias)
MERGE (actor:Actor { id: a.`id` })
	SET actor.biography = a.`biography`,
		actor.birthday = a.`birthday`,
		actor.deathday = a.`deathday`,
		actor.gender = a.`gender`,
		actor.homepage = a.`homepage`,
		actor.imdbId = a.`imdb_id`,
		actor.name = a.`name`,
		actor.placeOfBirth = a.`place_of_birth`,
		actor.popularity = a.`popularity`,
		actor.profileImg = a.`profile_path`

// Catch the cases where swapiId is empty. If empty do nothing, if exists, create PORTRAYED_BY relationship
FOREACH (foo IN
    CASE WHEN a.`swapiId` IS NOT NULL THEN [a] ELSE []
    END |
MERGE (c:Character { url: a.`swapiId` })
MERGE (c)-[:PORTRAYED_BY]-> (actor)
)

// Match actors with films that they appeared in
FOREACH (movie IN a.swapiMovies |
	MERGE (film:Film { url: movie })
	MERGE (film) <-[:APPEARS_IN]- (actor)
)

//UNWIND a.also_known_as AS aliases
//WITH aliases
//WHERE aliases IS NOT NULL
//FOREACH (alias IN aliases |
//	MERGE (alias:Alias { name: alias })
//	MERGE (alias) <-[:ALSO_KNOWN_AS]- (actor)
//)

