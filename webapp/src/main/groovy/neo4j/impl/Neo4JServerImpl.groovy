package neo4j.impl

import com.google.inject.Inject
import com.google.inject.name.Named
import config.AppConfig
import groovy.json.JsonBuilder
import groovy.json.JsonOutput
import groovy.util.logging.Slf4j
import neo4j.Neo4JServer
import ratpack.exec.Promise
import ratpack.http.client.HttpClient
import ratpack.http.client.ReceivedResponse

import java.time.Duration

/**
 * Created by IntelliJ IDEA.
 * User: ron
 * Date: 11/23/16
 * Time: 7:09 PM
 */
@Slf4j
class Neo4JServerImpl implements Neo4JServer
{
	private final AppConfig.HostDetails hostDetails
	private final HttpClient httpClient
	private final String txSplitRegex = hostDetails.txSplitRegex

	@Inject
	Neo4JServerImpl (@Named('NEO_SERVER') AppConfig.HostDetails hostDetails, HttpClient httpClient)
	{
		this.hostDetails = hostDetails
		this.httpClient = httpClient
	}

	@Override
	Promise<List<ReceivedResponse>> runRequest (String cypher, Map<String,Object> params = [:])
	{
		List<ReceivedResponse> errorResponses = []

		cypher.split (txSplitRegex).each { String statement ->
			httpClient.post (hostDetails.uri()) {
				it.connectTimeout (Duration.ofSeconds (hostDetails.readTimeout))
				it.headers.set ("Content-Type", 'application/json')
				it.headers.set ("Accept", 'application/json')
				it.basicAuth (hostDetails.user, hostDetails.pass)
				it.body.text (postBody (statement, params))
			} then { resp ->
				errorResponses << resp
			}
		}

		Promise.value (errorResponses)
	}

	// ----------------------------------------------------------

	private static String postBody (String cypher, Map<String,Object> params)
	{
		"""
			{
				"statements": [
					{
						"statement": "${escapeCypher (cypher)}",
						"parameters": {
							${formatParams (params)}
						},
						"resultDataContents": [
							"row",
							"graph"
						]
					}
				]
			}
		"""
	}

	private static String formatParams (Map<String,Object> params)
	{
		StringBuilder sb = new StringBuilder()

		params.eachWithIndex { String key, Object value, int index ->
			if (index != 0) sb.append (',\n')

			sb.append ('"').append (key).append ('": ')

			if (value instanceof JsonBuilder) {
				sb.append (value.toString())
			} else if (value instanceof AbstractMap) {
				sb.append (JsonOutput.toJson (value))
			} else if (value instanceof String) {
				sb.append ('"').append (value).append ('"')
			} else {
				sb.append ('"').append (value.toString()).append ('"')
			}
		}

		sb.append ('\n')

		sb.toString()
	}

	private static String escapeCypher (String cypher)
	{
		cypher.replaceAll ('\\/\\/.*\\n', ' ').replaceAll ('\n|\r|\t', ' ').replaceAll ('"', '\\\\"')
	}

}
