package config

import com.google.inject.AbstractModule
import com.google.inject.Scopes
import com.google.inject.name.Names
import neo.NeoLoadHandler
import org.neo4j.driver.v1.AuthTokens
import org.neo4j.driver.v1.Driver
import org.neo4j.driver.v1.GraphDatabase
import swapi.SwapiHandler

/**
 * Created by IntelliJ IDEA.
 * User: ron
 * Date: 11/20/16
 * Time: 3:06 PM
 */
class AppConfig extends AbstractModule
{
	final String SWAPI_BASE_URL = "http://swapi.co/api"
	final String SWAPI_ALL_OUTPUT_PATH = "/tmp/swapi.json"
	final String SWAPI_DATA_RESOURCE = "json/swapi.json"
	final String SWAPI_LOAD_CYPHER = "cypher/load-swapi.cypher"

	final String SWSOCIAL_CHARMAP_PATH = "json/character-resource-map.json"
	final String SWSOCIAL_INTERACTIONS_PATH = "json/starwars-full-interactions-allCharacters-merged.json"
	final String SWSOCIAL_LOAD_CYPHER = "cypher/load-swsocial.cypher"


	final String NEO_HOST = "192.168.99.100"
	final int NEO_PORT = 7474
	final String NEO_USER = 'neo4j'
	final String NEO_PASSWD = 'admin'
	final String NEO_TX_COMMIT_PATH = '/db/data/transaction/commit'

	final Map<String,String> neoDataMap = [
	        'swapi-json': SWAPI_DATA_RESOURCE, 'swapi-load-cypher': SWAPI_LOAD_CYPHER,
		'swsocial-char-map': SWSOCIAL_CHARMAP_PATH, 'swsocial-interactions': SWSOCIAL_INTERACTIONS_PATH,
		'swsocial-load-cypher': SWSOCIAL_LOAD_CYPHER
	]

	@Override
	protected void configure()
	{
		bind (String).annotatedWith (Names.named ("SWAPI_DATA_RESOURCE")).toInstance (SWAPI_DATA_RESOURCE)
		bind (String).annotatedWith (Names.named ("SWAPI_LOAD_CYPHER")).toInstance (SWAPI_LOAD_CYPHER)

		bind (Map).annotatedWith (Names.named ("NEO_DATA_MAP")).toInstance (neoDataMap)

		bind (String).annotatedWith (Names.named ("SWAPI_BASE_URL")).toInstance (SWAPI_BASE_URL)
		bind (String).annotatedWith (Names.named ("SWAPI_JSON_PATH")).toInstance (SWAPI_ALL_OUTPUT_PATH)

		bind (String).annotatedWith (Names.named ("NEO_HOST")).toInstance (NEO_HOST)
		bind (HostDetails).annotatedWith (Names.named ("NEO_SERVER")).toInstance (new HostDetails (hostName: NEO_HOST, port: NEO_PORT, user: NEO_USER, pass: NEO_PASSWD))

		Driver neoDriver = GraphDatabase.driver (NEO_HOST, AuthTokens.basic (NEO_USER, NEO_PASSWD))
		bind (Driver).toInstance (neoDriver)

		bind (SwapiHandler).in (Scopes.SINGLETON)
		bind (NeoLoadHandler).in (Scopes.SINGLETON)
	}

	class HostDetails
	{
		String hostName
		int port = 80
		String user
		String pass
		int readTimeout = 120
		String defaultPath = NEO_TX_COMMIT_PATH

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
