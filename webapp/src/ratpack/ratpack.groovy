
import static ratpack.groovy.Groovy.ratpack
import ratpack.handling.Context

ratpack
{
	serverConfig {
	}

	bindings {
	}

	handlers {
		all { Context c ->
			render "Hello World"
		}
	}
}


