package neo

import com.google.inject.Inject
import com.google.inject.name.Named
import config.AppConfig
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
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
	private final AppConfig.HostDetails hostDetails
	private final HttpClient httpClient
	private final Map<String,String> resourceNameMap

	@Inject
	NeoLoadHandler (@Named('NEO_DATA_MAP') Map resourceNameMap,
			@Named('NEO_SERVER') AppConfig.HostDetails hostDetails, HttpClient httpClient)
	{
		this.resourceNameMap = resourceNameMap
		this.hostDetails = hostDetails
		this.httpClient = httpClient
	}

	@Override
	void handle (Context context) throws Exception
	{
		List<ReceivedResponse> responses = []

		runJsonLoadRequest (getResourceAsText ('swapi-load-cypher'), ['json': getResourceAsText ('swapi-json')]).flatMap { responseList ->
			responses.addAll (responseList)

			String interactionsJson = buildInteractions (getResourceAsText ('swsocial-char-map'), getResourceAsText ('swsocial-interactions'))

			runJsonLoadRequest (getResourceAsText ('swsocial-load-cypher'), ['interactions': interactionsJson])
		} then { List<ReceivedResponse> responseList ->
			responses.addAll (responseList)

			if (responses.size() == 0) {
				context.response.status (200)
				context.response.contentType ('text/plain')
				context.response.send ("OK")
			} else {
				StringBuffer sb = new StringBuffer()

				responses.eachWithIndex { ReceivedResponse resp, int index ->
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

	private static String buildInteractions (String charMapJson, String swsocialInteractionsJson)
	{
		def charMap = new JsonSlurper().parseText (charMapJson)

		Map<String,String> nameToUrl = [:]

		charMap.entries.each {
			if (it.url != null) {
				nameToUrl [it.name] = it.url
			}
		}

		def inter = new JsonSlurper().parseText (swsocialInteractionsJson)

		List<Map> nodes = []

		inter.nodes.each {
			String url = nameToUrl [it.name]

			if (url != null) it ['url'] = url

			nodes << it
		}

		List<Map> links = []

		inter.links.each { link ->
			String srcUrl = nameToUrl [nodes [link.source as int].name]
			String tgtUrl = nameToUrl [nodes [link.target as int].name]

			if ((srcUrl != null) && (tgtUrl != null)) {
				links << [ 'from': srcUrl, 'to': tgtUrl, 'weight': link.value]
			}
		}

		def root = new JsonBuilder (['links': links, 'nodes': nodes])

		root.toString()
	}

	// --------------------------------------------------------------

	private String getResourceAsText (String resourceKey)
	{
		getClass().classLoader.getResourceAsStream (resourceNameMap [resourceKey]).text
	}

	private static final String TX_SPLIT_PATTERN = '\\/\\/ TX-SPLIT -+\\n'

	private Promise<List<ReceivedResponse>> runJsonLoadRequest (String cypher, Map<String,String> params)
	{
		List<ReceivedResponse> errorResponses = []


		cypher.split (TX_SPLIT_PATTERN).each { String statement ->
			httpClient.post (hostDetails.uri()) {
				it.readTimeoutSeconds (hostDetails.readTimeout)
				it.headers.set ("Content-Type", 'application/json')
				it.headers.set ("Accept", 'application/json')
				it.basicAuth (hostDetails.user, hostDetails.pass)
				it.body.text (postBody (statement, params))
			} then { resp ->
//				if (resp.statusCode != 200) {
					errorResponses << resp
//				}
			}
		}

		Promise.value (errorResponses)
	}

	private static String postBody (String cypher, Map<String,String> params)
	{
		"""
			{
				"statements": [
					{
						"statement": "${escapeCypher (cypher)}",
						"parameters": {
							${formatParams (params)}
						}
					}
				]
			}
		"""
	}

	private static String formatParams (Map<String,String> params)
	{
		StringBuilder sb = new StringBuilder()

		params.eachWithIndex { String key, String value, int index ->
			if (index != 0) sb.append (',\n')

			sb.append ('"').append (key).append ('": ').append (value)
		}

		sb.toString()
	}

	private static String escapeCypher (String cypher)
	{
		cypher.replaceAll ('\\/\\/.*\\n', ' ').replaceAll ('\n|\r|\t', ' ').replaceAll ('"', '\\"')
	}
}
