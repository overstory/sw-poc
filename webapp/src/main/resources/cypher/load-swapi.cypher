
// Loads the merged SWAPI JSON data into Neo4J

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

// TX-SPLIT ---------------------------------

// Removed Category from the graph, un-necessarily cluttered, label serve the same purpose
//MERGE (swapi:Swapi)
//  ON CREATE SET swapi.name = 'Star Wars API', swapi.downloaded = {json}.downloaded

//WITH swapi, {json} AS swapidata
WITH {json} AS swapidata
UNWIND swapidata.categories AS cat
//MERGE (category:Category { name: cat.name, uri: cat.uri })
//MERGE (category) -[:CATEGORY_OF]-> (swapi)

WITH {json}.categories[0] AS filmcat
//MATCH (category:Category { name: filmcat.name })
UNWIND filmcat.members AS f
MERGE (film:Film { url: f.url })
SET film.name = f.title, film.edited = f.edited, film.created = f.created,
	film.episode_id = f.episode_id,
	film.opening_crawl = f.opening_crawl, film.release_date = f.release.date
//MERGE (category) <-[:IN_CATEGORY]- (film)

FOREACH (furl IN f.characters |
	MERGE (character:Character { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (character)
)
FOREACH (furl IN f.planets |
	MERGE (planet:Planet { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (planet)
)
FOREACH (furl IN f.species |
	MERGE (species:Species { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (species)
)
FOREACH (furl IN f.starships |
	MERGE (starship:Starship { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (starship)
)
FOREACH (furl IN f.vehicles |
	MERGE (vehicle:Vehicle { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (vehicle)
)

WITH film, f
UNWIND split (f.director, ",") AS d
MERGE (dir:Director { name: d } )
MERGE (dir) <-[:DIRECTED_BY]- (film)

WITH film, f
UNWIND split (f.producer, ",") AS p
MERGE (prod:Producer { name: p } )
MERGE (prod) <-[:PRODUCED_BY]- (film)

// TX-SPLIT ---------------------------------

WITH {json}.categories[1] AS peoplecat
//MATCH (category:Category { name: peoplecat.name })
UNWIND peoplecat.members AS c
MERGE (character:Character { url: c.url })
SET character.name = c.name, character.edited = c.edited, character.created = c.created, character.birth_year = c.birth_year,
	character.eye_color = c.eye_color, character.hair_color = c.hair_color, character.gender = c.gender, character.height = c.height,
	character.mass = c.mass, character.skin_color = c.skin_color
//MERGE (category) <-[:IN_CATEGORY]- (character)

MERGE (homeworld:Planet { url: c.homeworld })
MERGE (homeworld) <-[:HOME_WORLD]- (character)

FOREACH (furl IN c.films |
	MERGE (film:Film { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (character)
)
FOREACH (furl IN c.species |
	MERGE (species:Species { url: furl })
	MERGE (species) <-[:IS_SPECIES]- (character)
)
FOREACH (furl IN c.starships |
	MERGE (starship:Starship { url: furl })
	MERGE (starship) <-[:KNOWS_STARSHIP]- (character)
)
FOREACH (furl IN c.vehicles |
	MERGE (vehicle:Vehicle { url: furl })
	MERGE (vehicle) <-[:KNOWS_VEHICLE]- (character)
)

// TX-SPLIT ---------------------------------

WITH {json}.categories[2] AS planetcat
//MATCH (category:Category { name: planetcat.name })
UNWIND planetcat.members AS p
MERGE (planet:Planet { url: p.url })
SET planet.name = p.name, planet.edited = p.edited, planet.created = p.created,
	planet.gravity = p.gravity, planet.orbital_period = p.orbital_period,
	planet.population = p.population, planet.rotation_period = p.rotation_period, planet.surface_water = p.surface_water,
	planet.diameter = p.diameter
//MERGE (category) <-[:IN_CATEGORY]- (planet)

FOREACH (furl IN p.films |
	MERGE (film:Film { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (planet)
)
FOREACH (furl IN p.residents |
	MERGE (character:Character { url: furl })
	MERGE (planet) <-[:RESIDENT_OF]- (character)
)

WITH planet, p
UNWIND split (p.climate, ",") AS c
MERGE (climate:Climate { type: c })
MERGE (climate) <-[:HAS_CLIMATE]- (planet)

WITH planet, p
UNWIND split (p.terrain, ",") AS t
MERGE (terrain:Terrain { type: t })
MERGE (terrain) <-[:HAS_TERRAIN]- (planet)

// TX-SPLIT ---------------------------------

WITH {json}.categories[3] AS speciescat
//MATCH (category:Category { name: speciescat.name })
UNWIND speciescat.members AS x
MERGE (species:Species { url: x.url })
SET species.name = x.name, species.edited = x.edited, species.created = x.created,
	species.average_height = x.average_height, species.average_lifespan = x.average_lifespan,
	species.classification = x.classification, species.eye_colors = x.eye_colors, species.hair_colors = x.hair_colors,
	species.language = x.language, species.skin_colors = x.skin_colors, species.designation = x.designation
//MERGE (category) <-[:IN_CATEGORY]- (species)

FOREACH (furl IN x.films |
	MERGE (film:Film { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (species)
)
FOREACH (furl IN x.people |
	MERGE (character:Character { url: furl })
	MERGE (species) <-[:IS_SPECIES]- (character)
)

// There is a null homeworld in the data (for Wookiee)
WITH species, x
WHERE x.homeworld IS NOT NULL
MERGE (homeworld:Planet { url: x.homeworld })
MERGE (homeworld) <-[:HOME_WORLD]- (species)


// TX-SPLIT ---------------------------------

WITH {json}.categories[4] AS shipcat
//MATCH (category:Category { name: shipcat.name })
UNWIND shipcat.members AS x
MERGE (starship:Starship { url: x.url })
SET starship.name = x.name, starship.edited = x.edited, starship.created = x.created,
	starship.MGLT = x.MGLT, starship.cargo_capacity = x.cargo_capacity, starship.consumables = x.consumables,
	starship.cost_in_credits = x.cost_in_credits, starship.crew = x.crew, starship.hyperdrive_rating = x.hyperdrive_rating,
	starship.length = x.length, starship.max_atmosphering_speed = x.max_atmosphering_speed,
	starship.model = x.model, starship.passengers = x.passengers
//MERGE (category) <-[:IN_CATEGORY]- (starship)

MERGE (m:Manufacturer { name: x.manufacturer})
MERGE (starship) -[:MANUFACTURED_BY]-> (m)

MERGE (c:StarshipClass { name: x.starship_class})
MERGE (starship) -[:IS_CLASS]-> (c)

FOREACH (furl IN x.films |
	MERGE (film:Film { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (starship)
)
FOREACH (furl IN x.pilots |
	MERGE (character:Character { url: furl })
	MERGE (starship) <-[:CAN_PILOT]- (character)
)

// TX-SPLIT ---------------------------------

WITH {json}.categories[5] AS vehiclecat
//MATCH (category:Category { name: vehiclecat.name })
UNWIND vehiclecat.members AS x
MERGE (vehicle:Vehicle { url: x.url })
SET vehicle.name = x.name, vehicle.edited = x.edited, vehicle.created = x.created,
	vehicle.cargo_capacity = x.cargo_capacity, vehicle.consumables = x.consumables, vehicle.cost_in_credits = x.cost_in_credits,
	vehicle.crew = x.crew, vehicle.length = x.length, vehicle.manufacturer = x.manufacturer, vehicle.max_atmosphering_speed = x.max_atmosphering_speed,
	vehicle.model = x.model, vehicle.passengers = x.passengers, vehicle.vehicle_class = x.vehicle_class
//MERGE (category) <-[:IN_CATEGORY]- (vehicle)

MERGE (m:Manufacturer { name: x.name})
MERGE (vehicle) -[:MANUFACTURED_BY]-> (m)

MERGE (v:VehicleClass { name: x.name})
MERGE (vehicle) -[:IS_CLASS]-> (v)

FOREACH (furl IN x.films |
	MERGE (film:Film { url: furl })
	MERGE (film) <-[:APPEARS_IN]- (vehicle)
)
FOREACH (furl IN x.pilots |
	MERGE (character:Character { url: furl })
	MERGE (vehicle) <-[:CAN_PILOT]- (character)
)

