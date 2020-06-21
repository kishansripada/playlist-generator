var request = require('request'); // "Request" library

var client_id = '29110b23f6d14d67856438c2504dd2c4' // Your client id
var client_secret = '66a194de8fc54b7eac48ae165ecdd09f' // Your secret

function count(arr, value) {
  var count = 0
  var newArr = arr.slice()
  while (newArr.indexOf(value) !== -1) {
    index = newArr.indexOf(value)
    newArr.splice(index, 1)
    count = count + 1
  }
  return count
}


async function getItems(url) {
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'client_credentials'
    },
    json: true
  };
  var items = [];

  async function getData(url, items) {
    return new Promise((resolve, reject) => {
      request.post(authOptions, function(error, response, body) {
        if (error || response.statusCode !== 200) reject(error);

        var token = body.access_token;
        var options = {
          url: url,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        request.get(options, function(error, response, body) {
          if (error) return reject(error);
          for (var item of body.items) {
            items.push(item)
          }
          if (response.body.next == null) {
            resolve([items, null])
          } else {
            resolve([items, response.body.next])
          }
        })
      })
    })
  }

  while (url) {
    var response = await getData(url, items);
    items = response[0];
    url = response[1];
  }
  return items;
}

async function playlist(playlistId) {
  var allArtistIds = []
  var songNames = []
  var uniqueArtists = []
  var target = []
  var source = []

  const items = await getItems('https://api.spotify.com/v1/playlists/' + playlistId + '/tracks');
  try {
    for (var item of items) {
      for (let i = 0; i < item.track.artists.length - 1; i++) {
        for (let j = i + 1; j < item.track.artists.length; j++) {
          source.push(item['track']['artists'][i]['id'])
          target.push(item['track']['artists'][j]['id'])
          songNames.push(item.track.name)

        }
      }
    }
  } catch (error) {
    console.error(error);
  }


  for (var item of items) {
    try {
      for (var i = 0; i < item.track.artists.length; i++) {
        allArtistIds.push(item.track.artists[i].id)
      }
    } catch (error) {
      console.log(error)
    }
  }


  // add ids to connectiondata
  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  var uniqueArtists = allArtistIds.filter(onlyUnique)


  // should return connection data and arist ids
  return [uniqueArtists, source, target, allArtistIds, songNames]

}

async function getArtists(playlistId) {
  const playlistData = await playlist(playlistId)
  var ids = playlistData[0]
  var ids2 = playlistData[0]
  var source = playlistData[1]
  var target = playlistData[2]
  var allArtistIds = playlistData[3]
  var songNames = playlistData[4]
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'client_credentials'
    },
    json: true
  };
  var items = [];

  async function getData(url, items) {
    return new Promise((resolve, reject) => {
      request.post(authOptions, function(error, response, body) {
        if (error || response.statusCode !== 200) reject(error);

        var token = body.access_token;
        var options = {
          url: url,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          json: true
        };
        console.log(url)
        request.get(options, function(error, response, body) {
          if (error) return reject(error);
          for (var item of body.artists) {
            items.push(item)
          }
          resolve(items)
        })
      })
    })
  }

  while (ids.length !== 0) {
    var response = await getData('https://api.spotify.com/v1/artists?ids=' + ids.splice(0, 50).join('%2C'), items);
  }
  return [items, source, target, allArtistIds, songNames];
}

async function main(playlistId) {
  var connectiondata = []
  var artistNames = []
  var artistIds = []
  var artistPopularity = []
  var artistImages = []
  var artistFrequency = []
  var link = playlistId + "?"

  const artistData = await getArtists(link.substring(
    link.lastIndexOf("/") + 1,
    link.indexOf("?")
  ))

  var items = artistData[0]
  var source = artistData[1]
  var target = artistData[2]
  var allArtistIds = artistData[3]
  var songNames = artistData[4]

  for (var artist of items) {
    artistIds.push(artist.id)
    artistPopularity.push(artist.popularity)
    artistNames.push(artist.name)
    try {
      artistImages.push(artist.images[0].url)
    } catch (error) {
      artistImages.push('none.png')
    }
  }

  // gets min
  var min = 0
  for (i = 0; i < artistPopularity.length; i++) {
    if (artistPopularity[i] > artistPopularity[i + 1]) {
      min = artistPopularity[i + 1]
    }
  }


  // gets average frequency
  var averageFrequency = 0
  for (var i = 0; i < artistIds.length; i++) {
    averageFrequency = averageFrequency + count(allArtistIds, artistIds[i])
  }
  averageFrequency = averageFrequency / artistIds.length
  console.log(averageFrequency)

  // VISNETWORK


  var nodes = null;
  var edges = null;
  var network = null;

  function draw() {
    var nodes = []
    var edges = []

    for (i = 0; i < artistNames.length; i++) {
      nodes.push({
        id: artistNames[i],
        shape: 'circularImage',
        image: artistImages[i],
        label: artistNames[i],
        size: (((count(allArtistIds, artistIds[i]) - averageFrequency) / -2) + (count(allArtistIds, artistIds[i]))) * 50 * (1 / averageFrequency)
      })
    }

    for (i = 0; i < source.length; i++) {
      edges.push({
        from: artistNames[artistIds.indexOf(source[i])],
        to: artistNames[artistIds.indexOf(target[i])],
        value: (count(allArtistIds, source[i]) + count(allArtistIds, target[i])) / 2,
        label: songNames[i].replace(/ *\([^)]*\) */g, "")
      })
    }

    var container = document.getElementById('mynetwork');
    var data = {
      nodes: nodes,
      edges: edges
    };
    var options = {
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -26,
          centralGravity: 0.002,
          springLength: 500,
          springConstant: 0.18
        },
        maxVelocity: 146,
        solver: 'forceAtlas2Based',
        timestep: 0.35,
        stabilization: {
          enabled: true,
          iterations: 2000,
          updateInterval: 25
        }
      },

      nodes: {
        borderWidth: 1,
        size: 10,
        color: {
          border: '#222222',
          background: '#FFFFFF'
        },
        font: {
          color: '#FFFFFF',
          size: 30
        }
      },
      edges: {
        color: '#8B94A4',
        font: {
          color: '#FFFFFF',
          size: 15,
          strokeWidth: 0.1
        }
      },
    };
    network = new vis.Network(container, data, options);
  }
  console.log('drawing network...')
  draw()
}

window.main = main
// main('https://open.spotify.com/playlist/7Da92EEdDESCrCuFNVwtUZ?si=uZFts0tfRuGpZxazOrvnFA')