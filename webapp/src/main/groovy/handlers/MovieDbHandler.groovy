package handlers

import com.google.inject.Inject
import com.google.inject.name.Named
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.util.logging.Slf4j
import ratpack.exec.Promise
import ratpack.func.Function
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
	private final String swapiResource
	private final String resourceJson
	private final String characterMap
	private final HttpClient httpClient
	private final Map<String,String> moviesMap

	@Inject
	MovieDbHandler (@Named('MOVIEDB_BASE_URL') String baseUri, @Named('MOVIEDB_API_KEY') String apiKey,
		@Named('CHARACTER_MAP') String characterMap, @Named('MOVIEDB_ACTORS_RESOURCE') String jsonDataResource,
		@Named('SWAPI_RESOURCE_MAP') String swapiResourceMap, @Named('MOVIEDB_MOVIES_RESOURCE') String resourceJson,
		HttpClient httpClient)
	{
		this.baseUri = baseUri
		this.apiKey = apiKey
		this.characterMap = characterMap
		this.swapiResource = swapiResourceMap
		this.resourceJson = resourceJson
		this.jsonDataResource = jsonDataResource
		this.httpClient = httpClient

		moviesMap = buildMdbToSwapiMovieMap()
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
		def characterMap = new JsonSlurper().parse (getClass().classLoader.getResourceAsStream (characterMap))
		def resMap = new JsonSlurper().parse (getClass().classLoader.getResourceAsStream (resourceJson))
		String now = new SimpleDateFormat ("yyyy-MM-dd'T'HH:mm:ss.'000Z'").format (new Date (System.currentTimeMillis()))
		def movieDbList = new JsonSlurper().parseText ("{ \"timestamp\": \"${now}\", \"items\": [] }")
		def movieDbItems = movieDbList.items
		Set seenIds = []

		characterMap.each { key, item ->
			item.eachWithIndex { Object entry, int index ->
				entry.movieDbId.each { String id ->
					if (id && ( ! seenIds.contains (id))) {
						seenIds.add (id)
						doGetRequest ("${baseUri}/person/${id}", apiKey).onError {
							println "Caught exception: ${it}"
							null
						} flatMap {
							def actor = new JsonSlurper().parseText (it)

							actor << [swapiId: entry.url]

							// Minor glitch in the MovieDB data, fixup so it will match
							if (actor ['name'] == 'J.J. Abrams') actor ['name'] = 'J. J. Abrams'

							decorateActorWithMovies (actor as Map<String,Object>)
						} then { actor ->
							movieDbItems << actor
						}
					}
				}
			}
		}

		seenIds.clear()

		resMap.movies.eachWithIndex { Map movie, int index ->
			String id = movie ['movieDbId']

			if (id && ( ! seenIds.contains (id))) {
				seenIds.add (id)

				doGetRequest ("${baseUri}/movie/${id}", apiKey).onError {
					println "Caught exception: ${it}"
					null
				} map {
					def film = new JsonSlurper().parseText (it)

					film << [swapiId: movie.swapiUrl]
				} then { film ->
					movieDbItems << film
				}
			}
		}

		Promise.value (movieDbList).map {
			new JsonBuilder (it).toPrettyString()
		}
	}

	private Promise<Map<String,Object>> decorateActorWithMovies (Map<String,Object> actor)
	{
		doGetRequest ("${baseUri}/person/${actor.id}/combined_credits", apiKey).map {
			def credits = new JsonSlurper().parseText (it).cast
			List<String> movies = []

			credits.each {
				String swapiUrl = moviesMap ["${it.id}".toString()]

				if (swapiUrl) movies << swapiUrl
			}

			actor << [swapiMovies: movies]
			actor
		}
	}

	private Map<String,String> buildMdbToSwapiMovieMap()
	{
		def moviesList = new JsonSlurper().parse (getClass().classLoader.getResourceAsStream (swapiResource)).movies
		Map<String,String> map = [:]

		moviesList.each { Map<String,String> movie ->
			map.put (movie ['movieDbId'], movie ['swapiUrl'])
		}

		map
	}

	private Promise<String> doGetRequest (String uri, String apiKey)
	{
		httpClient.get (new URI ("${uri}?api_key=${apiKey}")) {
			it.headers.set("Accept", 'application/json')
		} flatMap ({ ReceivedResponse response ->
			if (response.statusCode == 429) {
				println "Rate Limit (sleeping)"

				Thread.sleep (5000)

				return doGetRequest (uri, apiKey)
			}

			if (response.statusCode == 404) {
				throw new RuntimeException ("No such resource: ${uri}")
			}
			if (response.statusCode != 200) {
				throw new RuntimeException ("Unexpected result code: ${response.statusCode}")
			}

			Promise.value (response.body.text)
		} as Function)
	}
}
