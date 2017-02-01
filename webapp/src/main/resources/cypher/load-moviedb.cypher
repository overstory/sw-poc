
WITH {json} AS moviedb
UNWIND moviedb.actors AS a
// Actor (NODE {id: int})
// Actor <-[:PORTRAYED_BY]- Character
// Actor -[:APPEARS_IN]-> Film
// Actor -[:ALSO_KNOWN_AS]-> (Alias)
MERGE (actor:Actor { movieDbId: a.`id` })
	SET actor.movieDbId = a.`id`,
		actor.name = a.`name`,
		actor.imdbId = a.`imdb_id`,
		actor.biography = a.`biography`,
		actor.birthday = a.`birthday`,
		actor.deathday = a.`deathday`,
		actor.gender = CASE WHEN a.`gender` = 1 THEN 'female' WHEN a.`gender` = 2 THEN 'male' ELSE 'unknown' END,
		actor.homepage = a.`homepage`,
		actor.placeOfBirth = a.`place_of_birth`,
		actor.popularity = a.`popularity`,
		actor.movieDbImage = a.`profile_path`

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

