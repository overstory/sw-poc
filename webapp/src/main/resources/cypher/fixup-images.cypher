
// Set the depiction URL for a Character from the "depictions" section of the general purpose resources map
WITH {json} AS resources
UNWIND resources.depictions AS imgmap
MATCH (n { url: imgmap.`swapiUrl`})
SET n.depiction = imgmap.`depiction`

// TX-SPLIT -----------------------------------------

// This copies the actor's image into the character if is hasn't been set already
// ToDo: Many Characters have multiple actors.  Need a map to attach the preferred one when necessary?  Or just get imeage for everything and stop doing this?

MATCH (c:Character)
WHERE c.movieDbImage IS NULL
MATCH (a:Actor) <-[:PORTRAYED_BY]- (c) WHERE (a.movieDbImage IS NOT NULL) AND (c.depiction IS NULL)
SET c.movieDbImage = a.movieDbImage

