package neo4j.impl

import com.google.inject.Inject
import com.google.inject.name.Named
import config.AppConfig
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.util.logging.Slf4j
import neo4j.Neo4JServer
import ratpack.exec.Promise
import ratpack.http.client.HttpClient
import ratpack.http.client.ReceivedResponse

import java.time.Duration
import java.util.regex.Pattern

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
		List<Map<String,Object>> statements = []

		cypher.split (txSplitRegex).each { String statement ->
			Map<String,Object> stmtObj = [:]

			stmtObj ['statement'] = escapeCypher (statement)
			stmtObj ['parameters'] = params
			stmtObj ['resultDataContents'] = [ 'row', 'graph' ]

			statements << stmtObj
		}

		List<ReceivedResponse> responses = []

		if (params.size() == 0) {
			// If no params, bundle all parts into a single call
			def reqJson = new JsonSlurper().parseText ('{ "statements": [] }')

			reqJson.statements = statements

			issueRequest (new JsonBuilder (reqJson).toPrettyString(), responses)
		} else {
			// If params, issue a separate REST call for each statement to avoid blowing limits
			statements.each { Map<String,Object> statement ->
				def reqJson = new JsonSlurper().parseText ('{ "statements": [] }')

				reqJson.statements << statement

				issueRequest (new JsonBuilder (reqJson).toPrettyString(), responses)
			}
		}

		Promise.value (responses)
	}

	private void issueRequest (String body, List<ReceivedResponse> responses)
	{
		httpClient.post (hostDetails.uri()) {
			it.connectTimeout (Duration.ofSeconds (hostDetails.readTimeout))
			it.headers.set ("Content-Type", 'application/json')
			it.headers.set ("Accept", 'application/json')
			it.basicAuth (hostDetails.user, hostDetails.pass)
			it.body.text (body)
			it.maxContentLength (10000000)
		} then { resp ->
			responses << resp
		}
	}

	// ----------------------------------------------------------

	private static Pattern regex = Pattern.compile ('^\\s*\\/\\/.*$', Pattern.MULTILINE)

	private static String escapeCypher (String cypher)
	{
		cypher.replaceAll (regex, ' ').replaceAll ('[\n\r\t]', ' ')
	}
}
