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
	private static final String PARAM_MAGIC = "@PARAM@"	// ToDo: do this better
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
		String id = context.allPathTokens ['qid']
		Map<String,String> params = [:]

		params ['param1'] = (context.allPathTokens ['param1']) ?: ''
		params ['param2'] = (context.allPathTokens ['param2']) ?: ''
		params ['param3'] = (context.allPathTokens ['param3']) ?: ''


		runQueryById (id, params).onError { Throwable t ->
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

	Promise<String> runQueryById (String id, Map<String,String> params)
	{
		String cypher = cypherQueries [id]

		params.each { String key, String value ->
			cypher = cypher.replace ("@${key}@".toString(), value)
		}

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

	// See 'example-graph--desc.json'

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
					String img = (node.properties.depiction) ?: (node.properties.movieDbImage) ? "${movieDbBaseUri}${node.properties.movieDbImage}".toString() : node.properties.depiction

					nodeList << [id: node.id, type:node.properties.type, label: node.properties.name, swapi_url: node.properties.url, description: desc,
						     birthday: node.properties.birthday, deathday: node.properties.deathday, gender: node.properties.gender,
						     releaseDate: node.properties.releaseDate, openingCrawl: node.properties.opening_crawl, episodeId: node.properties.episode_id,
						     homepage: node.properties.homepage, tagline: node.properties.tagline, depiction: img, types: node.labels ]
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

	// ----------------------------------------------------------------

	// ToDo: Externalize these into a config file or separate files
	Map<String,String> cypherQueries = [
//		'root': 'MATCH p = (f:Film)-[]->() RETURN p',
		'root': """
MATCH (l:Character {url: 'http://swapi.co/api/people/1/'})
MATCH p=(o)<-[r]-(l)
RETURN p
""".toString(),
		'directed-by': 'MATCH p=()-[r:DIRECTED_BY]->() RETURN p LIMIT 50',
		'produced-by': 'MATCH p=()-[r:PRODUCED_BY]->() RETURN p LIMIT 50',
		'node-by-id': 'MATCH (n) WHERE ID(n) = @param1@ RETURN n',
		'referenced-nodes': 'MATCH (n)-[l]->(p) WHERE ID(n) = @param1@ RETURN p, l',
		'referencing-nodes': 'MATCH (n)<-[l]-(p) WHERE ID(n) = @param1@ RETURN p, l',
		'nodes-by-label': 'MATCH (n:@param1@) RETURN n',
		'shortest-path-by-name': """
MATCH (from:Character {name: "@param1@"})
MATCH (to:Character {name: "@param2@"})
MATCH p=shortestPath((from)-[SPEAKS_WITH*]-(to))
RETURN p
""".toString(),
		'shortest-path-by-id': """
MATCH (from:Character) WHERE ID(from) = @param1@
MATCH (to:Character) WHERE ID(to) = @param2@
MATCH p=shortestPath((from)-[:SPEAKS_WITH*]-(to))
RETURN p
""".toString(),
		'all-shortest-paths-by-id': """
MATCH (from:Character) WHERE ID(from) = @param1@
MATCH (to:Character) WHERE ID(to) = @param2@
MATCH p=allShortestPaths((from)-[:SPEAKS_WITH*]-(to))
RETURN p
""".toString(),
		'pivotal-node-by-id': """
MATCH (a:Character) WHERE ID(a) = @param1@
MATCH (b:Character) WHERE ID(b) = @param2@
MATCH p=allShortestPaths((a)-[:SPEAKS_WITH*]-(b)) WITH collect(p) AS paths, a, b
MATCH (c:Character) WHERE all(x IN paths WHERE c IN nodes(x)) AND NOT c IN [a,b]
RETURN a, b, c LIMIT 10
""".toString()
	]
}
