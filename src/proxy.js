addEventListener('fetch', (event) => {
    event.respondWith(
        handleRequest(event.request).catch(
            (err) => new Response(err.stack, {
                status: 500
            })
        )
    );
});

const handleRequest = async (request) => {
    const config = {
        unsplash: {
            client_id: '',
            collection: '11665420',
            referral: '?utm_source=mue&utm_medium=referral'
        },
        pexels: {
            token: '',
            collection: 'iwf78dt'
        },
        openweathermap: {
            app_id: '',
            // see https://openweathermap.org/current#multi, this list should include Mue languages that are included in the list
            supported_languages: ['en', 'de', 'es', 'fr', 'nl', 'no', 'ru', 'zh_CN']
        }
    }

    const { pathname, searchParams } = new URL(request.url);

    if (pathname.startsWith('/images')) {
        let resolution = '&w=1920'; // hd
        switch (searchParams.get('quality')) {
            case 'original':
                resolution = '';
                break;
            case 'high':
                resolution = '&w=3840';
                break;
            case 'normal':
                break;
            case 'datasaver':
                resolution = '&w=1280';
                break;
            default:
                break;
        }

        // unsplash
        if (pathname.startsWith('/images/unsplash')) {
            const data = await (await fetch(`https://api.unsplash.com/photos/random?client_id=${config.unsplash.client_id}&collections=${config.unsplash.collection}`)).json();
            await fetch(`${data.links.download_location}&client_id=${config.unsplash.client_id}`); // api requirement

            let location = '';
            if (data.location.country && data.location.city) {
                location = data.location.city + ', ' + data.location.country
            } else if (data.location.country) {
                location = data.location.country;
            } else if (data.location.city) {
                location = data.location.city;
            }

            return new Response(JSON.stringify({
                file: data.urls.full + resolution,
                photographer: data.user.name,
                location: location,
                photo_page: data.links.html,
                photographer_page: data.user.links.html + config.unsplash.referral, // also api requirement
                camera: data.exif.model,
            }), {
                status: 200,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // pexels
        if (pathname.startsWith('/images/pexels')) {
            let data = await (await fetch(`https://api.pexels.com/v1/collections/${config.pexels.collection}?per_page=80&page=${Math.floor(Math.random() * 2) + 1}`, {
                headers: {
                    'Authorization': config.pexels.token
                }
            })).json();
            data = data.media[Math.floor(Math.random() * data.media.length) + 1];

            return new Response(JSON.stringify({
                file: data.src.original + resolution,
                location: '',
                photographer: data.photographer,
                photographer_page: data.photographer_url,
                photo_page: data.url
            }), {
                status: 200,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }

    if (pathname.startsWith('/weather')) {
        // language 
        let language = searchParams.get('lang');

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
            default:
                language = 'en';
                break;
        }

        if (!config.openweathermap.supported_languages.includes(language)) {
            return new Response(JSON.stringify({
                'cod': '400',
                'message': 'language not supported'
            }), {
                status: 400,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // auto location
        if (pathname.startsWith('/weather/autolocation')) {
            const lat = searchParams.get('lat');
            const lon = searchParams.get('lon');

            if (lat && lon) {
                const data = await (await fetch(`http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${config.openweathermap.app_id}&lang=${language}`)).json();
                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: {
                        'content-type': 'application/json;charset=UTF-8',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } else {
                return new Response(JSON.stringify({
                    'cod': '400',
                    'message': 'missing lat or lon'
                }), {
                    status: 400,
                    headers: {
                        'content-type': 'application/json;charset=UTF-8',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
        }

        // weather
        const city = searchParams.get('city');
        if (city === null) {
            return new Response(JSON.stringify({
                'cod': '400',
                'message': 'no city provided'
            }), {
                status: 400,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // format
        let formatText;
        switch (searchParams.get('format')) {
            case 'celsius':
                formatText = '&units=metric';
                break;
            case 'fahrenheit':
                formatText = '&units=imperial';
                break;
            default:
                formatText = '';
                break;
        }

        const data = await (await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${config.openweathermap.app_id}&lang=${language}${formatText}`)).json();
        if (data.cod === '404') {
            return new Response(JSON.stringify(data), {
                status: 404,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        return new Response(JSON.stringify({
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
                'content-type': 'application/json;charset=UTF-8',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    return new Response(JSON.stringify({
        message: 'hello world'
    }), {
        status: 200,
        headers: {
            'content-type': 'application/json;charset=UTF-8',
            'Access-Control-Allow-Origin': '*'
        }
    });
}