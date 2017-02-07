package handlers

import com.google.inject.Inject
import com.google.inject.name.Named
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.util.logging.Slf4j
import neo4j.Neo4JServer
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
	private final Neo4JServer neo4JServer
	private final HttpClient httpClient
	private final Map<String,String> resourceNameMap

	@Inject
	NeoLoadHandler (@Named('NEO_DATA_MAP') Map resourceNameMap, Neo4JServer neo4JServer, HttpClient httpClient)
	{
		this.resourceNameMap = resourceNameMap
		this.neo4JServer = neo4JServer
		this.httpClient = httpClient
	}

	@Override
	void handle (Context context) throws Exception
	{
		// Scripts are run in this order
		List<String> scriptNames = [ 'add-constraints', 'swapi-load-cypher', 'swsocial-load-cypher', 'moviedb-load-cypher' ]

		Map<String,Map> scripts = [
			'add-constraints': [:],
			'swapi-load-cypher': ['json': getResourceAsJson ('swapi-json')],
			'swsocial-load-cypher': ['interactions': buildInteractions (getResourceAsJson ('swsocial-char-map'), getResourceAsJson ('swsocial-interactions')).getContent()],
			'moviedb-load-cypher': ['json': getResourceAsJson ('moviedb-json')]
		]

		List<ReceivedResponse> responses = []

		scriptNames.each { String name ->
			Map value = scripts [name]

			neo4JServer.runRequest (getResourceAsText (name), value).then { responseList ->
				responses.addAll (responseList)
			}
		}

		Promise.value (responses).then { List<ReceivedResponse> resps ->
			if (resps.size() == 0) {
				context.response.status (200)
				context.response.contentType ('text/plain')
				context.response.send ("OK")
			} else {
				def respJson = new JsonSlurper().parseText ('{ "combined-results": [] }')
				def resultsArray = respJson.'combined-results'

				resps.eachWithIndex { ReceivedResponse resp, int index ->
					def body = new JsonSlurper().parseText (resp.body.text)

					if (body.errors.size() != 0) {
						resultsArray << body
					}
				}

				new JsonBuilder (respJson).toPrettyString()

				context.response.contentType ('application/json')
				context.response.send (new JsonBuilder (respJson).toPrettyString())
			}
		}
	}

	// --------------------------------------------------------------

	private static JsonBuilder buildInteractions (Object charMap, Object inter)
	{
		Map<String,String> nameToUrl = [:]

		charMap.entries.each {
			if (it.url != null) {
				nameToUrl [it.name] = it.url
			}
		}

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

		new JsonBuilder (['links': links, 'nodes': nodes])
	}

	// --------------------------------------------------------------

	private String getResourceAsText (String resourceKey)
	{
		getClass().classLoader.getResourceAsStream (resourceNameMap [resourceKey]).text
	}

	private Object getResourceAsJson (String resourceKey)
	{
		new JsonSlurper().parseText (getResourceAsText (resourceKey))
	}
}
