addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
  });
  
  /**
   * Respond to the request
   * @param {Request} request
   */
  async function handleRequest(request) {
    let data = await (await fetch(`https://api.pexels.com/v1/collections/iwf78dt?per_page=80&page=${Math.floor(Math.random() * 2) + 1}`, {
      headers: {
        'Authorization': 'TOKEN'
      }
    })).json();
    data = data.media[Math.floor(Math.random() * data.media.length) + 1];
  
    const { searchParams } = new URL(request.url);
    const quality = searchParams.get('quality');
  
    let resolution = '?w=1920'; // hd
    if (quality) {
      switch (quality) {
        case 'original':
          resolution = '';
          break;
        case 'high':
          resolution = '?w=3840';
          break;
        case 'normal':
          break;
        case 'datasaver':
          resolution = '?w=1280';
          break;
        default:
          break;
      }
    }
  
    let response = new Response(JSON.stringify({
        file: data.src.original + resolution,
        location: '',
        resolution: '1920x1080',
        photographer: data.photographer,
        photographer_page: data.photographer_url,
        photo_page: data.url
      }), { status: 200, headers: {
      "content-type": "application/json;charset=UTF-8"
    }});
  
    response.headers.set("Access-Control-Allow-Origin", "*");
  
    return response;
  }