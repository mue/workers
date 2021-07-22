addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
  });
  
  /**
   * Respond to the request
   * @param {Request} request
   */
  async function handleRequest(request) {
    const data = await (await fetch(`https://api.unsplash.com/photos/random?client_id=TOKEN&collections=11665420`)).json();
    await fetch(`${data.links.download_location}&client_id=TOKEN`); // api requirement
  
    let location = '';
    if (data.location.country && data.location.city) {
      location = data.location.city + ', ' + data.location.country
    } else if (data.location.country) {
      location = data.location.country;
    } else if (data.location.city) {
      location = data.location.city;
    }
  
    const { searchParams } = new URL(request.url);
    const quality = searchParams.get('quality');
  
    let resolution = '&w=1920'; // hd
    if (quality) {
      switch (quality) {
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
    }
  
    const response = new Response(JSON.stringify({
        file: data.urls.full + resolution,
        photographer: data.user.name,
        location: location,
        photo_page: data.links.html,
        photographer_page: data.user.links.html + '?utm_source=mue&utm_medium=referral',
        camera: data.exif.model,
        resolution: '1920x1080'
      }), { status: 200, headers: {
        "content-type": "application/json;charset=UTF-8"
    }});
  
    response.headers.set("Access-Control-Allow-Origin", "*");
  
    return response;
  }