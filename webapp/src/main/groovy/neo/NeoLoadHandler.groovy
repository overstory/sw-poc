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
		} then { List<ReceivedResponse> errList ->
			if (errList.size() == 0) {
				context.response.status (200)
				context.response.contentType ('text/plain')
				context.response.send ("OK")
			} else {
				StringBuffer sb = new StringBuffer()

				errList.eachWithIndex { ReceivedResponse resp, int index ->
					sb.append ("\nResult ${index}, code=${resp.statusCode}, content-type=${resp.headers.get ("content-type")}\n")
					sb.append ('------------------------------------------------------------------------\n')
					sb.append (resp.body.text)
					sb.append ('\n------------------------------------------------------------------------\n')
				}

				context.response.send (sb.toString())
			}
		}
	}

	// --------------------------------------------------------------

	private static final String TX_SPLIT_PATTERN = '\\/\\/ TX-SPLIT -+\\n'

	private Promise<List<ReceivedResponse>> runJsonLoadRequest (String cypher, String json)
	{
		List<ReceivedResponse> errorResponses = []

		cypher.split (TX_SPLIT_PATTERN).each { String statement ->
			httpClient.post (hostDetails.uri()) {
				it.readTimeoutSeconds (hostDetails.readTimeout)
				it.headers.set ("Content-Type", 'application/json')
				it.headers.set ("Accept", 'application/json')
				it.basicAuth (hostDetails.user, hostDetails.pass)
				it.body.text (postBody (statement, json))
			} then { resp ->
//				if (resp.statusCode != 200) {
					errorResponses << resp
//				}
			}
		}

		Promise.value (errorResponses)
	}

	private static String postBody (String cypher, String json)
	{
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
	}

	private static String escapeCypher (String cypher)
	{
		cypher.replaceAll ('\\/\\/.*\\n', ' ').replaceAll ('\n|\r|\t', ' ').replaceAll ('"', '\\"')
	}
}
