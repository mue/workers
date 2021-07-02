addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
});

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
    const { searchParams } = new URL(request.url);

    // language 
    let language = searchParams.get('lang');
    const supportedLanguages = ['en', 'de', 'es', 'fr', 'nl', 'no', 'ru', 'zh_CN'];

    if (!language) {
        language = 'en';
    }

    switch (language) {
        case 'zh_CN':
          language = 'zh_cn';
          break;
        case 'en_US':
        case 'en_GB':
          language = 'en';
          break;
        case 'de_DE':
          language = 'de';
          break;
    }

    if (!supportedLanguages.includes(language)) {
        let response = new Response(JSON.stringify({
            "cod": "400",
            "message": "language not supported"
        }), {
            status: 400,
            headers: {
                "content-type": "application/json;charset=UTF-8"
            }
        });

        response.headers.set("Access-Control-Allow-Origin", "*");

        return response;
    }

    // auto location
    const getAuto = searchParams.get('getAuto');
    if (getAuto !== null) {
      const lat = searchParams.get('lat');
      const lon = searchParams.get('lon');

      if (lat && lon) {
        const data = await (await fetch(`http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=TOKEN&lang=${language}`)).json();
        let response = new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                "content-type": "application/json;charset=UTF-8"
            }
        });

        response.headers.set("Access-Control-Allow-Origin", "*");

        return response;
      }
    }

    // weather
    const city = searchParams.get('city');
    if (city === null) {
        let response = new Response(JSON.stringify({
            "cod": "400",
            "message": "no city provided"
        }), {
            status: 400,
            headers: {
                "content-type": "application/json;charset=UTF-8"
            }
        });

        response.headers.set("Access-Control-Allow-Origin", "*");

        return response;
    }

    const data = await (await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=TOKEN&lang=${language}`)).json();
    if (data.cod === '404') {
        let response = new Response(JSON.stringify(data), {
          status: 200,
          headers: {
              "content-type": "application/json;charset=UTF-8"
          }
        })

        response.headers.set("Access-Control-Allow-Origin", "*");

        return response;
    }

    let response = new Response(JSON.stringify({
        weather: [{
            main: data.weather[0].main,
            description: data.weather[0].description,
            icon: data.weather[0].icon
        }],
        main: {
            temp: data.main.temp,
            temp_min: data.main.temp_min,
            temp_max: data.main.temp_max,
            pressure: data.main.pressure,
            humidity: data.main.humidity
        },
        visibility: data.visibility,
        wind: {
            speed: data.wind.speed,
            deg: data.wind.deg
        },
        clouds: {
            all: data.clouds.all
        }
    }), {
        status: 200,
        headers: {
            "content-type": "application/json;charset=UTF-8"
        }
    })

    response.headers.set("Access-Control-Allow-Origin", "*");

    return response;
}