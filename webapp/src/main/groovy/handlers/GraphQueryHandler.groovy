package handlers

import com.google.inject.Inject
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

	@Inject
	GraphQueryHandler (Neo4JServer neo4JServer)
	{
		this.neo4JServer = neo4JServer
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
//		String cypher = cypherQueries [id]
//
//		if (id == null) return Promise.value (null)
//
//		neo4JServer.runRequest (cypher).map { ReceivedResponse resp ->
//			if (resp.statusCode != 200) {
//				throw new RuntimeException (resp.body.text)
//			}
//
//			neoResultToVisJs (resp.body.text)
//		}


		Promise.value (queryResults [id])

	}

	// ----------------------------------------------------------------

	private String neoResultToVisJs (String neoJsonText)
	{
		Object neoJson = new JsonSlurper().parseText (neoJsonText)

		null   // ToDo
	}

	// ----------------------------------------------------------------

	Map<String,String> cypherQueries = [
	        'directed-by': 'MATCH p=()-[r:DIRECTED_BY]->() RETURN p LIMIT 50',
	        'produced-by': 'MATCH p=()-[r:PRODUCED_BY]->() RETURN p LIMIT 50'
	]

	private Map<String, String> queryResults = [
	        'root': new JsonBuilder (network1).toPrettyString()
	]

	private static List<Map<String,Object>> nodes = [
	        [id: 1,  value: 2,  label: 'Algie'],
		[id: 2,  value: 31, label: 'Alston'],
		[id: 3,  value: 12, label: 'Barney'],
		[id: 4,  value: 16, label: 'Coley'],
		[id: 5,  value: 17, label: 'Grant'],
		[id: 6,  value: 15, label: 'Langdon'],
		[id: 7,  value: 6,  label: 'Lee'],
		[id: 8,  value: 5,  label: 'Merlin'],
		[id: 9,  value: 30, label: 'Mick'],
		[id: 10, value: 18, label: 'Tod']
	]

	private static List<Map<String,Object>> edges = [
		[from: 2, to: 8, value: 3, title: '3 emails per week'],
		[from: 2, to: 9, value: 5, title: '5 emails per week'],
		[from: 2, to: 10,value: 1, title: '1 emails per week'],
		[from: 4, to: 6, value: 8, title: '8 emails per week'],
		[from: 5, to: 7, value: 2, title: '2 emails per week'],
		[from: 4, to: 5, value: 1, title: '1 emails per week'],
		[from: 9, to: 10,value: 2, title: '2 emails per week'],
		[from: 2, to: 3, value: 6, title: '6 emails per week'],
		[from: 3, to: 9, value: 4, title: '4 emails per week'],
		[from: 5, to: 3, value: 1, title: '1 emails per week'],
		[from: 2, to: 7, value: 4, title: '4 emails per week']
	]

	private static Map<String,Object> options = [
		nodes: [
			shape: 'dot',
			scaling: [ label: [ min: 8, max: 20 ] ]
		]
	]

	private static Map<String,Object> data = [
		nodes: nodes, edges: edges
	]

	private static Map<String,Object> network1 = [
		data: data, options: options
	]
}
