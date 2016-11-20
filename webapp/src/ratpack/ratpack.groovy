import ch.qos.logback.core.util.StatusPrinter
import config.AppConfig
import groovy.util.logging.Slf4j
import org.slf4j.LoggerFactory
import swapi.SwapiHandler

import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.gaffer.GafferConfigurator


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

		all { Context c ->
			render "Missed it by THAT much"
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




