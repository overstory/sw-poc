package handlers

import com.google.inject.Inject
import com.google.inject.name.Named
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import neo4j.Neo4JServer
import ratpack.exec.Promise
import ratpack.handling.Context
import ratpack.handling.Handler
import ratpack.http.client.ReceivedResponse

/**
 * Created by IntelliJ IDEA.
 * User: ron
 * Date: 12/17/16
 * Time: 3:20 PM
 */
class GraphQueryHandler implements Handler
{
	private final Neo4JServer neo4JServer
	private final String movieDbBaseUri

	@Inject
	GraphQueryHandler (Neo4JServer neo4JServer, @Named('MOVIEDB_IMAGE_BASE_URL') String movieDbBaseUri)
	{
		this.neo4JServer = neo4JServer
		this.movieDbBaseUri = movieDbBaseUri
	}

	@Override
	void handle (Context context) throws Exception
	{
		String id = context.allPathTokens ['id']

		runQueryById (id).onError { Throwable t ->
			context.response.contentType ('text/plain')
			context.response.status (500)
			context.render (t.toString())
		} then { String json ->
			if (json) {
				context.response.contentType ('application/json')
				context.response.status (200)
				context.render (json)
			} else {
				context.response.contentType ('text/plain')
				context.response.status (404)
				context.render ("Cannot find stored query with id: ${id}")
			}
		}
	}

	Promise<String> runQueryById (String id)
	{
		String cypher = cypherQueries [id]

		if (id == null) return Promise.value (null)

		neo4JServer.runRequest (cypher).map { ReceivedResponse resp ->
			if (resp.statusCode != 200) {
				throw new RuntimeException (resp.body.text)
			}

			neoResultToResponseJson (resp.body.text)
		}


//		Promise.value (queryResults [id])

	}

	// ----------------------------------------------------------------

	/*



	 */

	private String neoResultToResponseJson (String neoJsonText)
	{
		Object neoJson = new JsonSlurper().parseText (neoJsonText)
		List<Map<String,Object>> data = neoJson.results[0].data

		List<Map<String,String>> nodeList = []
		List<Map<String,String>> edgeList = []
		Set<String> nodesSeen = []
		Set<String> edgesSeen = []

		data.each {  dataRow ->
			Map<String,Object> graph = dataRow.graph
			List<Map<String,Object>> nodes = graph.nodes
			List<Map<String,Object>> relationships = graph.relationships

			nodes.each { Map<String,Object> node ->
				if ( ! nodesSeen.contains (node.id)) {
					String desc = (node.properties.biography) ?: (node.properties.opening_crawl) ?: node.properties.description
					String img = (node.properties.movieDbImage) ? "${movieDbBaseUri}${node.properties.movieDbImage}".toString() : node.properties.depiction

					nodeList << [id: node.id, label: node.properties.name, swapi_url: node.properties.url, description: desc, birthday: node.properties.birthday, deathday: node.properties.deathday, gender: node.properties.gender, homepage: node.properties.homepage, depiction: img, types: node.labels ]
					nodesSeen << node.id
				}
			}

			relationships.each { Map<String,Object> rel ->
				if ( ! edgesSeen.contains (rel.id)) {
					// ToDo: set arrowhead values according to directionality of relationship
					Map<String,Object> arrowProps = [from: false, to: true]

					edgeList << [id: rel.id, from: rel.startNode, to: rel.endNode, label: rel.type, arrows: arrowProps]
					edgesSeen << rel.id
				}
			}
		}

		Map<String,Object> network = [options:[], nodes: nodeList, edges: edgeList]
		Map<String,Object> root = [options:[], network: network]

		new JsonBuilder (root).toPrettyString()
	}

	static final Map<String,Object> bubbleOptions = [
		nodes: [
			shape: 'dot'
		],
		edges: [
			smooth: false
//		        smooth: [
//				type: 'dynamic',
//				forceDirection: 'none',
//				roundness: 0.3
//			]
		],
		physics: [
			repulsion: [
				centralGravity: 0,
				springLength: 350,
				springConstant: 0.58
			],
//			barnesHut: [
//				gravitationalConstant: -10500,
//				centralGravity: 1.6,
//				springLength: 350,
//				springConstant: 0.29,
//				damping: 0.21,
//				avoidOverlap: 0.43
//			],
			maxVelocity: 79,
			minVelocity: 0.35
		]
	]

	// ----------------------------------------------------------------

	Map<String,String> cypherQueries = [
	        'root': 'MATCH p=()-[r:DIRECTED_BY]->() RETURN p LIMIT 50',
	        'directed-by': 'MATCH p=()-[r:DIRECTED_BY]->() RETURN p LIMIT 50',
	        'produced-by': 'MATCH p=()-[r:PRODUCED_BY]->() RETURN p LIMIT 50'
	]

//	private Map<String, String> queryResults = [
//	        'root': new JsonBuilder (network1).toPrettyString()
//	]
//
//	private static List<Map<String,Object>> nodes = [
//	        [id: 1,  value: 2,  label: 'Algie'],
//		[id: 2,  value: 31, label: 'Alston'],
//		[id: 3,  value: 12, label: 'Barney'],
//		[id: 4,  value: 16, label: 'Coley'],
//		[id: 5,  value: 17, label: 'Grant'],
//		[id: 6,  value: 15, label: 'Langdon'],
//		[id: 7,  value: 6,  label: 'Lee'],
//		[id: 8,  value: 5,  label: 'Merlin'],
//		[id: 9,  value: 30, label: 'Mick'],
//		[id: 10, value: 18, label: 'Tod']
//	]
//
//	private static List<Map<String,Object>> edges = [
//		[from: 2, to: 8, value: 3, title: '3 emails per week'],
//		[from: 2, to: 9, value: 5, title: '5 emails per week'],
//		[from: 2, to: 10,value: 1, title: '1 emails per week'],
//		[from: 4, to: 6, value: 8, title: '8 emails per week'],
//		[from: 5, to: 7, value: 2, title: '2 emails per week'],
//		[from: 4, to: 5, value: 1, title: '1 emails per week'],
//		[from: 9, to: 10,value: 2, title: '2 emails per week'],
//		[from: 2, to: 3, value: 6, title: '6 emails per week'],
//		[from: 3, to: 9, value: 4, title: '4 emails per week'],
//		[from: 5, to: 3, value: 1, title: '1 emails per week'],
//		[from: 2, to: 7, value: 4, title: '4 emails per week']
//	]
//
//	private static Map<String,Object> options = [
//		nodes: [
//			shape: 'dot',
//			scaling: [ label: [ min: 8, max: 20 ] ]
//		]
//	]
//
//	private static Map<String,Object> data = [
//		nodes: nodes, edges: edges
//	]
//
//	private static Map<String,Object> network1 = [
//		data: data, options: options
//	]
}
