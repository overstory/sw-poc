package neo4j

import ratpack.exec.Promise
import ratpack.http.client.ReceivedResponse

/**
 * Created by IntelliJ IDEA.
 * User: ron
 * Date: 11/23/16
 * Time: 7:04 PM
 */
interface Neo4JServer
{
	Promise<List<ReceivedResponse>> runRequest (String cypher, Map<String, Object> params)
}
