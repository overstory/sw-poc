package config

import com.google.inject.AbstractModule
import com.google.inject.name.Names
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

	@Override
	protected void configure()
	{
		bind (String).annotatedWith (Names.named ("SWAPI_BASE_URL")).toInstance (SWAPI_BASE_URL)
		bind (String).annotatedWith (Names.named ("SWAPI_JSON_PATH")).toInstance (SWAPI_JSON_PATH)

		bind SwapiHandler
	}
}
