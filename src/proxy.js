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
        },
        umami: {
            enabled: true,
            url: '',
            id: ''
        },
        mapbox: {
            token: ''
        }
    }

    const umami = class Umami {
        static async request(url) {
            await fetch(config.umami.url + '/api/collect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': request.headers.get('User-Agent')
                },
                body: JSON.stringify({
                    type: 'pageview',
                    payload: {
                        website: config.umami.id,
                        url: url,
                        language: '',
                        screen: ''
                    }
                })
            });
        }

        static async error(url, error) {
            await fetch(config.umami.url + '/api/collect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': request.headers.get('User-Agent')
                },
                body: JSON.stringify({
                    type: 'event',
                    payload: {
                        website: config.umami.id,
                        url: url,
                        event_type: 'error',
                        event_value: error
                    }
                })
            });
        }
    }

    const {
        pathname,
        searchParams
    } = new URL(request.url);

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
            if (config.umami.enabled === true) {
                await umami.request('/images/unsplash');
            }

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

            const object = {
                file: data.urls.full + resolution,
                photographer: data.user.name,
                location: location,
                photo_page: data.links.html,
                photographer_page: data.user.links.html + config.unsplash.referral, // also api requirement
                camera: data.exif.model
            }

            const map = searchParams.get('map');
            if (map === 'true') {
               if (data.location.position.latitude) {
                   object.latitude = data.location.position.latitude;
               }
               if (data.location.position.longitude) {
                   object.longitude = data.location.position.longitude;
               }
            
               object.maptoken = config.mapbox.token;
            }

            return new Response(JSON.stringify(object), {
                status: 200,
                headers: {
                    'content-type': 'application/json;charset=UTF-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // pexels
        if (pathname.startsWith('/images/pexels')) {
            if (config.umami.enabled === true) {
                await umami.request('/images/pexels');
            }

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
            if (config.umami.enabled === true) {
                await umami.error('/weather', 'language-not-supported');
            }

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

            if (config.umami.enabled === true) {
                await umami.request('/weather/autolocation');
            }

            if (lat && lon) {
                const data = await (await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${config.openweathermap.app_id}&lang=${language}`)).json();

                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: {
                        'content-type': 'application/json;charset=UTF-8',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } else {
                if (config.umami.enabled === true) {
                    await umami.error('/weather', 'autolocation-not-provided');
                }

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
        if (config.umami.enabled === true) {
            await umami.request('/weather');
        }

        const city = searchParams.get('city');
        if (city === null) {
            if (config.umami.enabled === true) {
                await umami.error('/weather', 'city-not-provided');
            }

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

        const data = await (await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${config.openweathermap.app_id}&lang=${language}`)).json();
        if (data.cod === '404') {
            if (config.umami.enabled === true) {
                await umami.error('/weather', 'data-not-found');
            }

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
            },
            id: data.id
        }), {
            status: 200,
            headers: {
                'content-type': 'application/json;charset=UTF-8',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    if (config.umami.enabled === true) {
        await umami.request('/');
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
