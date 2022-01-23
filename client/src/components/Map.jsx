import React, { useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  featureCollection as turfFeatureCollection,
} from '@turf/turf'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getDepot } from '../services/getDepot'
import { addStart, addEnd } from '../reducers/startendReducer'
import { addLocation } from '../reducers/locationsReducer'
import styled from 'styled-components'
import Sidebar from './Sidebar'
import Locations from './Locations'

import { initState } from './init10locations' //init 10 locations for testing

const MapContainer = styled.div`
  height: 400px;
  position: absolute;
  width: 100%;
  margin: auto;
`
const Geocoder = styled.div`
  position: absolute;
  margin: auto;
  z-index: 1;
  top: 400px;
`
const FlexContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1em;
`

const Map = () => {
  const token = process.env.REACT_APP_MAPBOX_TOKEN
  mapboxgl.accessToken = token
  const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
  })

  const userDATA = useSelector((state) => state.userDATA)
  console.log(userDATA)

  const dispatch = useDispatch()

  const mapContainer = useRef(null)
  const geocoderContainer = useRef(null)
  const map = useRef(null)

  /**
   * route sources
   **/
  const addresses = useSelector((state) => state.addresses)
  let route = turfFeatureCollection([])

  /**
   * Since I implemented the IP geolocation I'm not sure
   * we still need the navigator.
   * I find the solution with the ipgeolocation more pleasant since it
   * doesn't bother the user with prompts
   **/
  // if (navigator.geolocation) {
  //   navigator.geolocation.getCurrentPosition(
  //     ({ coords }) => CENTER_INIT = [coords.longitude, coords.latitude],
  //     console.error,
  //     { maximumAge: 0, enableHighAccuracy: true }
  //   )
  // } else {
  //   console.log('browser doesn\'t allow geolocation')
  // }

  const createMapLayers = () => {
    geocoderContainer.current.appendChild(geocoder.onAdd(map.current))

    /**
     * create a point map for path
     */
    map.current.addLayer({
      id: 'dropoffs-symbol',
      type: 'symbol',
      source: {
        data: addresses,
        type: 'geojson',
      },
      layout: {
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-image': 'marker-15',
      },
    })

    map.current.addSource('route', {
      type: 'geojson',
      data: route,
    })

    map.current.addLayer(
      {
        id: 'routeline-active',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3887be',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 22, 12],
        },
      },
      'waterway-label'
    )

    map.current.addLayer(
      {
        id: 'routearrows',
        type: 'symbol',
        source: 'route',
        layout: {
          'symbol-placement': 'line',
          'text-field': '▶',
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 24, 22, 60],
          'symbol-spacing': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12,
            30,
            22,
            160,
          ],
          'text-keep-upright': false,
        },
        paint: {
          'text-color': '#3887be',
          'text-halo-color': 'hsl(55, 11%, 96%)',
          'text-halo-width': 3,
        },
      },
      'waterway-label'
    )
  }

  const addSearchLocation = (coordinates) => {
    /**
     * The addLocation action receives an array so that
     * it can also accept multiple locations as argument
     * (like from a file)
     */
    dispatch(addLocation([coordinates]))
    map.current.getSource('dropoffs-symbol').setData(addresses)
  }

  useEffect(() => {
    if (map.current !== null) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: userDATA ? [userDATA.longitude, userDATA.latitude] : [4.3755, 50.8550],
      zoom: userDATA ? 12 : 7
    })
    map.current.on('load', createMapLayers)

    dispatch(addLocation(initState)) //init 10 addresses for testing
  })

  useEffect(() => {
    (async () => {
      const DEPOT = await getDepot(userDATA.longitude, userDATA.latitude)
      dispatch(addStart(DEPOT))
      dispatch(addEnd(DEPOT))
    })()
  }, [userDATA])

  geocoder.on('result', (event) => {
    addSearchLocation(event.result)
  })

  return (
    <FlexContainer>
      <div style={{ position: 'absolute', width: '100%' }}>
        <Sidebar map={map.current} />
        <MapContainer ref={mapContainer} />
      </div>
      <Geocoder ref={geocoderContainer} />
      <Locations map={map.current} />
    </FlexContainer>
  )
}

export default Map
