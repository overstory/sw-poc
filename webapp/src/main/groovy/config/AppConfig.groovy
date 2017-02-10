package config

import com.google.inject.AbstractModule
import com.google.inject.Scopes
import com.google.inject.name.Names
import handlers.GraphQueryHandler
import handlers.MovieDbHandler
import handlers.NeoLoadHandler
import neo4j.Neo4JServer
import neo4j.impl.Neo4JServerImpl
import org.neo4j.driver.v1.AuthTokens
import org.neo4j.driver.v1.Driver
import org.neo4j.driver.v1.GraphDatabase
import handlers.SwapiHandler

/**
 * Created by IntelliJ IDEA.
 * User: ron
 * Date: 11/20/16
 * Time: 3:06 PM
 */
class AppConfig extends AbstractModule
{
	// FixMe: these values should be in an external config file
	final static String SWAPI_BASE_URL = "http://swapi.co/api"
	final static String SWAPI_ALL_OUTPUT_PATH = "/tmp/swapi.json"
	final static String SWAPI_DATA_RESOURCE = "json/swapi.json"
	final static String SWAPI_LOAD_CYPHER = "cypher/load-swapi.cypher"
	final static String SWAPI_RESOURCE_MAP = "json/resource-map.json"

	final static String MOVIEDB_BASE_URL = "http://api.themoviedb.org/3"
	final static String MOVIEDB_IMAGE_BASE_URL = "http://image.tmdb.org/t/p/w185"
	final static String MOVIEDB_API_KEY = "52201713fb76d70a41d93c1cefe0ae03"
	final static String MOVIEDB_MOVIES_RESOURCE = "json/resource-map.json"
	final static String MOVIEDB_ACTORS_RESOURCE = "json/moviedb-actors.json"
	final static String CHARACTER_MAP = "json/character-resource-map.json"

	final static String TX_SPLIT_PATTERN = '\\/\\/ TX-SPLIT -+\\n'


	final String NEO_HOST = "192.168.99.100"
	final int NEO_PORT = 7474
	final String NEO_USER = 'neo4j'
	final String NEO_PASSWD = 'admin'
	final String NEO_TX_COMMIT_PATH = '/db/data/transaction/commit'

	final Map<String,String> neoDataMap = [
		'add-constraints': 'cypher/db-setup.cypher',
		'swapi-json': SWAPI_DATA_RESOURCE,
		'swapi-load-cypher': SWAPI_LOAD_CYPHER,
		'swsocial-char-map': 'json/character-resource-map.json',
		'swsocial-interactions': 'json/starwars-full-interactions-allCharacters-merged.json',
		'swsocial-load-cypher': 'cypher/load-swsocial.cypher',
		'moviedb-json': MOVIEDB_ACTORS_RESOURCE,
		'moviedb-res-json': MOVIEDB_MOVIES_RESOURCE,
		'moviedb-load-cypher': 'cypher/load-moviedb.cypher'
	]

	@Override
	protected void configure()
	{
		bind (String).annotatedWith (Names.named ("CHARACTER_MAP")).toInstance (CHARACTER_MAP)
		bind (String).annotatedWith (Names.named ("SWAPI_RESOURCE_MAP")).toInstance (SWAPI_RESOURCE_MAP)

		bind (String).annotatedWith (Names.named ("SWAPI_DATA_RESOURCE")).toInstance (SWAPI_DATA_RESOURCE)
		bind (String).annotatedWith (Names.named ("SWAPI_LOAD_CYPHER")).toInstance (SWAPI_LOAD_CYPHER)

		bind (Map).annotatedWith (Names.named ("NEO_DATA_MAP")).toInstance (neoDataMap)

		bind (String).annotatedWith (Names.named ("SWAPI_BASE_URL")).toInstance (SWAPI_BASE_URL)
		bind (String).annotatedWith (Names.named ("SWAPI_JSON_PATH")).toInstance (SWAPI_ALL_OUTPUT_PATH)

		bind (String).annotatedWith (Names.named ("MOVIEDB_BASE_URL")).toInstance (MOVIEDB_BASE_URL)
		bind (String).annotatedWith (Names.named ("MOVIEDB_IMAGE_BASE_URL")).toInstance (MOVIEDB_IMAGE_BASE_URL)
		bind (String).annotatedWith (Names.named ("MOVIEDB_API_KEY")).toInstance (MOVIEDB_API_KEY)
		bind (String).annotatedWith (Names.named ("MOVIEDB_ACTORS_RESOURCE")).toInstance (MOVIEDB_ACTORS_RESOURCE)
		bind (String).annotatedWith (Names.named ("MOVIEDB_MOVIES_RESOURCE")).toInstance (MOVIEDB_MOVIES_RESOURCE)

		bind (String).annotatedWith (Names.named ("NEO_HOST")).toInstance (NEO_HOST)
		bind (HostDetails).annotatedWith (Names.named ("NEO_SERVER")).toInstance (new HostDetails (hostName: NEO_HOST, port: NEO_PORT, user: NEO_USER, pass: NEO_PASSWD))

		Driver neoDriver = GraphDatabase.driver (NEO_HOST, AuthTokens.basic (NEO_USER, NEO_PASSWD))
		bind (Driver).toInstance (neoDriver)

		bind (Neo4JServer).to (Neo4JServerImpl).in (Scopes.SINGLETON)
		bind (SwapiHandler).in (Scopes.SINGLETON)
		bind (MovieDbHandler).in (Scopes.SINGLETON)
		bind (NeoLoadHandler).in (Scopes.SINGLETON)
		bind (GraphQueryHandler).in (Scopes.SINGLETON)
	}

	class HostDetails
	{
		String hostName
		int port = 80
		String user
		String pass
		int readTimeout = 120
		String defaultPath = NEO_TX_COMMIT_PATH
		String txSplitRegex = TX_SPLIT_PATTERN

		URI uri()
		{
			new URI ("http://${hostName}:${port}${defaultPath}")

		}

		URI uriFor (String path)
		{
			new URI ("http://${hostName}:${port}${defaultPath}${path}")
		}
	}
}
