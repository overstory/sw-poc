import ch.qos.logback.classic.encoder.PatternLayoutEncoder
import ch.qos.logback.core.ConsoleAppender

import static ch.qos.logback.classic.Level.*

appender("STDOUT", ConsoleAppender) {
    encoder(PatternLayoutEncoder) {
        pattern = "%d{yyyy-MM-dd'T'HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
    }
}
root(INFO, ["STDOUT"])

// Config listener is really noisy.  This suppresses some of the messages.
logger('org.apache.http', INFO)
logger('groovyx.net.http', INFO)
logger('ratpack.config', INFO)
logger('ratpack.server', INFO)
logger('com.amazonaws', INFO)
logger('io.netty', INFO)
logger('com.jayway', INFO)
logger('ch.qos', ERROR)
logger('org.apache.http', INFO)
logger('groovyx.net.http', INFO)

logger('org.cambridge', INFO)
logger('monitors', DEBUG)
logger('config', DEBUG)
logger('handlers', DEBUG)
logger('models', WARN)
logger('repositories', DEBUG)
logger('runner', INFO)
logger('jobs.impl', WARN)
logger('handlers.publish', DEBUG)
logger('repositories.impl.consignment', INFO)
logger('services.impl', INFO)
logger('ratpack.exec.internal.DefaultBatchPromise', INFO)