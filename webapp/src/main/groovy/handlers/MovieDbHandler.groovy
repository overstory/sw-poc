package handlers

import com.google.inject.Inject
import com.google.inject.name.Named
import groovy.json.JsonBuilder
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import groovy.util.logging.Slf4j
import groovy.xml.XmlUtil
import ratpack.exec.Downstream
import ratpack.exec.Promise
import ratpack.handling.Context
import ratpack.handling.Handler
import ratpack.http.client.HttpClient
import ratpack.http.client.ReceivedResponse

import java.text.SimpleDateFormat

/**
 * Created by IntelliJ IDEA.
 * User: ron
 * Date: 11/20/16
 * Time: 2:44 PM
 */
@Slf4j
class MovieDbHandler implements Handler
{
	private final String baseUri
	private final String apiKey
	private final String jsonDataResource
	private final String characterMap
	private final HttpClient httpClient

	@Inject
	MovieDbHandler (@Named('MOVIEDB_BASE_URL') String baseUri, @Named('MOVIEDB_API_KEY') String apiKey,
		@Named('CHARACTER_MAP') String characterMap, @Named('MOVIEDB_DATA_RESOURCE') String jsonDataResource,
		HttpClient httpClient)
	{
		this.baseUri = baseUri
		this.apiKey = apiKey
		this.characterMap = characterMap
		this.jsonDataResource = jsonDataResource
		this.httpClient = httpClient
	}

	@Override
	void handle (Context context) throws Exception
	{
		if (context.request.path.endsWith ('cached')) {
			InputStream jsonData = getClass().classLoader.getResourceAsStream (jsonDataResource)

			context.response.contentType ('application/json')
			context.response.send (jsonData.text)
		} else {
			aggregateMovieDbData (baseUri).then { String jsonData ->
				context.response.contentType ('application/json')
				context.render (jsonData)
			}
		}
	}

	// -------------------------------------------------

	private Promise<String> aggregateMovieDbData (String baseUri)
	{
		def map = new JsonSlurper().parse (getClass().classLoader.getResourceAsStream (characterMap))
		String now = new SimpleDateFormat ("yyyy-MM-dd'T'HH:mm:ss.'000Z'").format (new Date (System.currentTimeMillis()))
		def actorList = new JsonSlurper().parseText ("{ \"timestamp\": \"${now}\", \"actors\": [] }")
		def actors = actorList.actors

		map.entries.eachWithIndex { Object entry, int index ->
			entry.movieDbId.each { String id ->
				if (id) {
					doGetRequest ("${baseUri}/${id}", apiKey).then {
						if (it) {
							def actor = new JsonSlurper().parseText (it)

							actor << [swapiId: entry.url]
							actors << actor
						}
					}
				}
			}
		}

		Promise.value (actorList).map {
			new JsonBuilder (it).toPrettyString()
		}
	}

	private Promise<String> doGetRequest (String uri, String apiKey)
	{
		httpClient.get (new URI ("${uri}?api_key=${apiKey}")) {
			it.headers.set("Accept", 'application/json')
		} map { ReceivedResponse response ->
			if (response.statusCode == 404) {
				println "No such resource: ${uri}"
				return ''
			}
			if (response.statusCode != 200) {
				throw new RuntimeException ("Unexpected result code: ${response.statusCode}")
			}

			response.body.text
		}
	}
}
