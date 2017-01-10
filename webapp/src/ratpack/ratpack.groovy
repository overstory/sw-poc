import ch.qos.logback.core.util.StatusPrinter
import config.AppConfig
import groovy.util.logging.Slf4j
import handlers.GraphQueryHandler
import handlers.NeoLoadHandler
import org.slf4j.LoggerFactory
import handlers.SwapiHandler

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

		path ('neo/load') { Context c ->
			byMethod {
				get { insert c.get (NeoLoadHandler) }
			}
		}

		path ('graph/query/id/:id') { Context c ->
			byMethod {
				get { insert c.get (GraphQueryHandler) }
			}
		}

		path ("::(css|fonts|images|js).*") {
			Path asset = file ("public/${request.path}")

			if (asset.toFile().exists()) render asset else next()
		}

		path ("::.*\\.(css|js|jpg|jpeg|png|gif|ico|map)") {
			Path asset = file ("public/${request.path}")

			if (asset.toFile().exists()) render asset else next()
		}

		all { Context c ->
			Path asset = file ("public/index.html")

			if (asset.toFile().exists()) render asset else next()
		}
	}

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




