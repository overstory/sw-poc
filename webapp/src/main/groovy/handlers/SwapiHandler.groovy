package handlers

import com.google.inject.Inject
import com.google.inject.name.Named
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import groovy.util.logging.Slf4j
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
class SwapiHandler implements Handler
{
	private final String baseUri
	private final String jsonDataPath
	private final String jsonDataResource
	private final HttpClient httpClient

	@Inject
	SwapiHandler (@Named('SWAPI_BASE_URL') String baseUri, @Named('SWAPI_JSON_PATH') String jsonDataPath,
		@Named('SWAPI_DATA_RESOURCE') String jsonDataResource, HttpClient httpClient)
	{
		this.baseUri = baseUri
		this.jsonDataPath = jsonDataPath
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
			aggregateSwapiData (baseUri).then { String swapiData ->
				if (context.request.headers.get ("accept").contains ('application/json')) {
					context.response.contentType ('application/json')
					context.render (swapiData)
				} else {
					storeSwapiData (swapiData, jsonDataPath).onError {
						context.response.status (500)
						context.response.contentType ('text/plain')
						context.render (it.toString())
					} then {
						context.response.contentType ('text/plain')
						context.render ("SWAPI Data aggregated OK, written to ${jsonDataPath}")
					}
				}
			}
		}

	}

	// -------------------------------------------------

	private Promise<String> aggregateSwapiData (String uri)
	{
		StringBuilder sb = new StringBuilder()
		String now = new SimpleDateFormat ("yyyy-MM-dd'T'HH:mm:ss.'000Z'").format (new Date (System.currentTimeMillis()))

		swapiGetRequest (uri).flatMap {
			def rootCollection = new JsonSlurper().parseText (it)

			Promise.value (null).then {
				sb.append ('{\n')
				sb.append ('"downloaded": "').append (now).append ('",\n')
				sb.append ('"categories": [\n')
			}

			rootCollection.eachWithIndex { String key, String value, int index ->
				collectJson (key, value).then {
					if (index != 0) sb.append ('\n,\n')
					sb.append (it)
				}
			}

			Promise.value (null).map {
				sb.append ('\n]\n}\n')
				sb.toString()
			}
		}
	}

	private Promise<String> collectJson (String collectionName, String collectionUri)
	{
		StringBuilder sb = new StringBuilder()

		Promise.value (null).then {
			sb.append ('{')
			sb.append ('"name": "').append (collectionName).append ('",\n')
			sb.append ('"uri": "').append (collectionUri).append ('",\n')
			sb.append ('"').append ('members').append ('": [')
		}

		Promise.async { Downstream fulfiller ->
			collectJsonPage (collectionUri, sb, fulfiller, true)
		} then {
		}

		Promise.value (null).map {
			sb.append ('\n]\n}\n')

			sb.toString()
		}
	}

	private Promise<String> collectJsonPage (String collectionUri, StringBuilder sb, Downstream fulfiller, boolean first)
	{
		if (collectionUri == null) {
			fulfiller.success (null)
			return
		}

		boolean needComma = ! first

		swapiGetRequest (collectionUri).then {
			def json = new JsonSlurper().parseText (it)
			String nextUri = json.next

			json.results.each {
				if (needComma) sb.append ('\n,\n')

				needComma = true

				sb.append (JsonOutput.toJson (it))
			}

			collectJsonPage (nextUri, sb, fulfiller, false)
		}
	}

	private static Promise<Void> storeSwapiData (String swapiData, String jsonDataPath)
	{
		Promise.async { Downstream fulfiller ->
			try {
				File file = new File (jsonDataPath)

				file.write (swapiData)

				fulfiller.success (null)
			} catch (Exception e) {
				fulfiller.error (e)
			}
		}
	}

	private Promise<String> swapiGetRequest (String uri)
	{
		httpClient.get (new URI (uri)) {
			it.headers.set("Accept", 'application/json')
		} map { ReceivedResponse response ->
			if (response.statusCode != 200) {
				throw new RuntimeException ("Unexpected result code: ${response.statusCode}")
			}

			response.body.text
		}
	}
}
