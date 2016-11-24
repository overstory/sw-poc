
// Loads the swsocial munged interaction JSON data into Neo4J

WITH {interactions} AS inter
UNWIND inter.links AS link

MERGE (src:Character { url: link.`from` })
MERGE (tgt:Character { url: link.`to` })
// Setting link weight value from swsocial data.  Should re-calculate
MERGE (src) -[:SPEAKS_WITH { interact_weight: link.weight }]-> (tgt)

// Setting betweenness value from swsocial data.  Should re-calculate
WITH inter
UNWIND inter.nodes AS nod
WITH nod
WHERE nod.url IS NOT NULL
MERGE (character:Character { url: nod.url })
	SET character.betweenness = nod.value

