
// ToDo: Create a map of character images to attach to Character nodes before attaching actor images
// ToDo: Many Characters have multiple actors.  Need a map to attach the preferred one when necessary

MATCH (c:Character)
WHERE c.movieDbImage IS NULL
MATCH (a:Actor) <-[:PORTRAYED_BY]- (c) WHERE a.movieDbImage IS NOT NULL
SET c.movieDbImage = a.movieDbImage

