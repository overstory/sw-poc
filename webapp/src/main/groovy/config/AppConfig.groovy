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
	final String SWAPI_JSON_PATH = "/tmp/swapi.json"
	final String SWAPI_DATA_RESOURCE = "swapi.json"
	final String SWAPI_LOAD_CYPHER = "cypher/load-swapi.cypher"
	final String NEO_HOST = "192.168.99.100"
	final int NEO_PORT = 7474
	final String NEO_USER = 'neo4j'
	final String NEO_PASSWD = 'admin'
	final String NEO_COMMIT_PATH = 'admin'

	@Override
	protected void configure()
	{
		bind (String).annotatedWith (Names.named ("SWAPI_BASE_URL")).toInstance (SWAPI_BASE_URL)
		bind (String).annotatedWith (Names.named ("SWAPI_JSON_PATH")).toInstance (SWAPI_JSON_PATH)
		bind (String).annotatedWith (Names.named ("NEO_HOST")).toInstance (NEO_HOST)
		bind (String).annotatedWith (Names.named ("SWAPI_DATA_RESOURCE")).toInstance (SWAPI_DATA_RESOURCE)
		bind (String).annotatedWith (Names.named ("SWAPI_LOAD_CYPHER")).toInstance (SWAPI_LOAD_CYPHER)

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
		String defaultPath = '/db/data/transaction/commit'

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
