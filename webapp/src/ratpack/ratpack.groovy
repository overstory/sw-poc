import ch.qos.logback.core.util.StatusPrinter
import config.AppConfig
import groovy.util.logging.Slf4j
import handlers.GraphQueryHandler
import handlers.NeoLoadHandler
import org.slf4j.LoggerFactory
import handlers.SwapiHandler
import handlers.MovieDbHandler

import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.gaffer.GafferConfigurator

import java.nio.file.Path

import static ratpack.groovy.Groovy.ratpack
import ratpack.handling.Context

ratpack
{
	serverConfig
	{
		LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory()
		context.reset()
		GafferConfigurator gafferConfigurator = new GafferConfigurator(context)
		gafferConfigurator.run (new File("${System.getProperty('user.home')}/.content-service/logback.groovy"))  // FixMe, use correct path

		StatusPrinter.printInCaseOfErrorsOrWarnings(context)
	}

	bindings
	{
		module AppConfig
	}

	handlers
	{
		path ('swapi/download') { Context c ->
			byMethod {
				get { insert c.get (SwapiHandler) }
			}
		}
		path ('swapi/cached') { Context c ->
			byMethod {
				get { insert c.get (SwapiHandler) }
			}
		}

		path ('moviedb/download') { Context c ->
			byMethod {
				get { insert c.get (MovieDbHandler) }
			}
		}
		path ('moviedb/cached') { Context c ->
			byMethod {
				get { insert c.get (MovieDbHandler) }
			}
		}

		path ('neo/load') { Context c ->
			byMethod {
				get { insert c.get (NeoLoadHandler) }
			}
		}

		path ('graph/query/id/:qid/:param1?/:param2?/:param3?') { Context c ->
			byMethod {
				get { insert c.get (GraphQueryHandler) }
			}
		}


		// Catch the empty patch and match it to index.html
		path ("") {
			mapPath (context, [ 'public' ], 'index.html')
		}

		// If a static file exists with the requested name, serve it out
		path ("::(.*)") { Context context ->
			mapPath (context, [ 'public', 'public/assets' ], request.path)
		}

		// Special handling for Cypher and JSON files
		path ("::(.*\\.(json|cypher))") { Context context ->
			mapPath (context, [ '.' ], request.path)
		}

		// if it look like a simple path identifier, assume it's an Angular page name
		path ("::([-a-zA-Z0-9]*)") {
			mapPath (context, [ 'public' ], 'index.html')
		}

		all {
			response.status (404)
			render "No such resoource: ${request.path}"
		}
	}
}

static void mapPath (Context context, List<String> prefixes, String path)
{
	for (String prefix : prefixes) {
		Path asset = context.file ("${prefix}/${path}")

		if (asset.toFile().exists()) {
			context.render asset
			return
		}
	}

	context.next()
}

@Slf4j
class LogHelper
{
	static void logInfo (String msg)
	{
		log.info (msg)
	}

	static void logDebug (String msg)
	{
		log.debug (msg)
	}
}




