
// Loads the merged SWAPI JSON data into Neo4J

//WITH {json} AS document
//UNWIND document.categories AS category
//RETURN category.name

//CREATE CONSTRAINT ON (f:Film) ASSERT f.url IS UNIQUE
//CREATE CONSTRAINT ON (c:Character) ASSERT c.url IS UNIQUE
//CREATE CONSTRAINT ON (p:Planet) ASSERT p.url IS UNIQUE


MERGE (swapi:Swapi)
  ON CREATE SET swapi.name = 'Star Wars API', swapi.downloaded = {json}.downloaded

WITH swapi, {json} AS swapidata
UNWIND swapidata.categories AS cat
MERGE (category:Category { name: cat.name, uri: cat.uri })
MERGE (category) -[:CATEGORY_OF]-> (swapi)

WITH {json}.categories[0] AS filmcat
MATCH (category:Category { name: filmcat.name })
UNWIND filmcat.members AS f
MERGE (film:Film { name: f.title })
SET film.url = f.url, film.episode_id = f.episode_id, film.edited = f.edited, film.created = f.created, film.director = f.director,
	film.producer = f.producer, film.opening_crawl = f.opening_crawl, film.release_date = f.release.date
MERGE (category) <-[:IN_CATEGORY]- (film)
MERGE (director:Director { name: f.director} )
MERGE (director) -[:DIRECTED]-> (film)
MERGE (producer:Producer { name: f.producer} )
MERGE (producer) -[:PRODUCED]-> (film)

// ---------------------------------

WITH {json}.categories[1] AS peoplecat
MATCH (category:Category { name: peoplecat.name })
UNWIND peoplecat.members AS c
MERGE (character:Character { url: c.url })
SET character.name = c.name, character.edited = c.edited, character.created = c.created, character.birth_year = c.birth_year,
	character.eye_color = c.eye_color, character.hair_color = c.hair_color, character.gender = c.gender, character.height = c.height,
	character.mass = c.mass, character.skin_color = c.skin_color
MERGE (category) <-[:IN_CATEGORY]- (character)

FOREACH (furl IN c.films |
	MERGE (film:Film { url: furl })
	MERGE (film) <-[:IN_FILM]- (character)
)

// ---------------------------------

WITH {json}.categories[2] AS planetcat
MATCH (category:Category { name: planetcat.name })
UNWIND planetcat.members AS p
MERGE (planet:Planet { url: p.url })
SET planet.name = p.name, planet.edited = p.edited, planet.created = p.created, planet.url = p.url,
	planet.climate = p.climate, planet.gravity = p.gravity, planet.orbital_period = p.orbital_period,
	planet.population = p.population, planet.rotation_period = p.rotation_period, planet.surface_water = p.surface_water,
	planet.terrain = p.terrain
MERGE (category) <-[:IN_CATEGORY]- (planet)

FOREACH (furl IN p.films |
	MERGE (film:Film { url: furl })
	MERGE (film) <-[:IN_FILM]- (planet)
)
//FOREACH (furl IN p.residents |
//	MERGE (character:Character { url: furl })
//	MERGE (planet) <-[:RESIDES_ON]- (character)
//)

// ---------------------------------




//WITH {json} AS swapidata
//UNWIND swapidata.categories[0].members AS f
//MERGE (film:Film { id: f.url })
//SET film.name = film.title, film.episode_id = f.episode_id, film.edited = f.edited, film.created = f.created, film.director = f.director,
//	film.producer = f.producer, film.opening_crawl = f.opening_crawl, film.release_date = f.release.date











//
//FOREACH (tagName IN q.tags | MERGE (tag:Tag {name:tagName}) MERGE (question)-[:TAGGED]->(tag))
//
//
//
//MERGE (question:Question {id:q.question_id}) ON CREATE
//  SET question.title = q.title, question.share_link = q.share_link, question.favorite_count = q.favorite_count
//
//MERGE (owner:User {id:q.owner.user_id}) ON CREATE SET owner.display_name = q.owner.display_name
//MERGE (owner)-[:ASKED]->(question)
//
//FOREACH (tagName IN q.tags | MERGE (tag:Tag {name:tagName}) MERGE (question)-[:TAGGED]->(tag))
//FOREACH (a IN q.answers |
//   MERGE (question)<-[:ANSWERS]-(answer:Answer {id:a.answer_id})
//   MERGE (answerer:User {id:a.owner.user_id}) ON CREATE SET answerer.display_name = a.owner.display_name
//   MERGE (answer)<-[:PROVIDED]-(answerer)
//)
