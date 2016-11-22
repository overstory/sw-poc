Star Wars POC Webapp
=========

Steps to setup and run this POC

* Pull the Docker image `overstory/general:neo4j-v1` from DockerHub
* Create a container from the image.  You need to map the containers `/data` directory to a directory on your machine.  This is where Neo4J will create its database.  I recommend $THIS_SOURCE_TREE/neo-database (it's already ignored in `.gitignore`)
* Use a command like this: `docker run -p 7474:7474 -p 7473:7473 -p 7687:7687 -v {path-to-this-code}/neo-database:/data -d overstory/general:neo4j-v1`
* With the container running, start the RatPack app.  Use the Gradle task `application>run`, or set one up in IntelliJ to run `ratpack.groovy.GroovyRatpackMain` with the webapp_main module classpath
* Hit the URL [http://localhost:5050/neo/load](http://localhost:5050/neo/load) with a browser, PostMan or curl.  If it comes back with a bunch of empty JSON responses, that's good.  Otherwise the Neo4J connection may not be right.  Check the `AppConfig` class.
* Point your browser at [http://192.168.99.100:7474](http://192.168.99.100:7474), which is the Neo4J console.  You may need to change the password if it's the first time you've connected.  Default is `neo4j`/`neo4j`.
* Click around (see the shortcut buttons on the left side where the database symbol is).  Remember that the shortcut buttons limit output to 25 items.  Click the Cypher code it generates and edit in the top window to get more output.
* To wipe the DB and start again, stop the Docker container, remove everything under `neo-database` and start the container again.

More work to do here.  I'm going to try running some graph analysis queries to see what kind of patterns I can find.  I may also
try enriching this data with additional, such as actors for characters and relationships such as that
Luke and Leia are siblings, and both are children of Anakin, that Anakin and Darth Vader are the same person, etc.

Ron Hitchens
2016-11-22
