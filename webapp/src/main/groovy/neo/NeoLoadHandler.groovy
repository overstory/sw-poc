package neo

import com.google.inject.Inject
import com.google.inject.name.Named
import config.AppConfig
import groovy.util.logging.Slf4j
import ratpack.exec.Promise
import ratpack.handling.Context
import ratpack.handling.Handler
import ratpack.http.client.HttpClient
import ratpack.http.client.ReceivedResponse

/**
 * Created by IntelliJ IDEA.
 * User: ron
 * Date: 11/20/16
 * Time: 8:57 PM
 */
@Slf4j
class NeoLoadHandler implements Handler
{
	private final String swapiJsonResource
	private final String swapiLoadCypher
	private final AppConfig.HostDetails hostDetails
	private final HttpClient httpClient

	@Inject
	NeoLoadHandler (@Named('SWAPI_DATA_RESOURCE') String swapiJsonResource,
			@Named('SWAPI_LOAD_CYPHER') String swapiLoadCypher,
			@Named('NEO_SERVER') AppConfig.HostDetails hostDetails, HttpClient httpClient)
	{
		this.swapiJsonResource = swapiJsonResource
		this.swapiLoadCypher = swapiLoadCypher
		this.hostDetails = hostDetails
		this.httpClient = httpClient
	}

	@Override
	void handle (Context context) throws Exception
	{
		String json = getClass().classLoader.getResourceAsStream (swapiJsonResource).text
		String cypher = getClass().classLoader.getResourceAsStream (swapiLoadCypher).text

		runJsonLoadRequest (cypher, json).onError {
			context.response.status (500)
			context.render (it.toString())
		} then { ReceivedResponse resp ->
			context.response.status (resp.statusCode)
			context.response.contentType (resp.headers.get ('Content-Type'))
			context.response.send (resp.body.text)
		}
	}

	// --------------------------------------------------------------

	private Promise<ReceivedResponse> runJsonLoadRequest (String cypher, String json)
	{
		String postBody =
			"""
			{
				"statements": [
					{
						"statement": "${escapeCypher (cypher)}",
						"parameters": {
							"json": ${json}
						}
					}
				]
			}
		"""

log.info ("CYPHER: ${escapeCypher (cypher)}")
		httpClient.post (hostDetails.uri()) {
			it.readTimeoutSeconds (hostDetails.readTimeout)
			it.headers.set ("Content-Type", 'application/json')
			it.headers.set ("Accept", 'application/json')
			it.basicAuth (hostDetails.user, hostDetails.pass)
			it.body.text (postBody)
		} map {
			log.info ("RESP: ${it}")
			it
		}
	}

	private String escapeCypher (String cypher)
	{
		cypher.replaceAll ('\\/\\/.*\\n', ' ').replaceAll ('\n|\r|\t', ' ').replaceAll ('"', '\\"')
	}
}
