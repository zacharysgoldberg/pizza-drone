'use strict';

class Orders {
  date = new Date();
  time =
    this.date.getHours() +
    ':' +
    this.date.getMinutes() +
    ':' +
    this.date.getSeconds();
  id = this.date.toISOString().slice(-4, this.date.length);
  clicks = 0;

  constructor(coords) {
    this.coords = coords; // {lat, long}
    // this.distance = distance; // km
    // this.duration = duration; // min
  }

  _setDescription(time) {
    // prettier-ignore
    const months = [
      'January', 
      'February', 
      'March', 
      'April', 
      'May',
      'June', 
      'July', 
      'August', 
      'September', 
      'October', 
      'November', 
      'December'
    ];

    this.description = `${this.inputType[0].toUpperCase()}${this.inputType.slice(
      1
    )} at ${this.time}`;
  }

  click() {
    this.clicks++;
  }
}

class Base extends Orders {
  inputType = 'base';

  constructor(coords) {
    super(coords);
    // let d = this.calcMaxRange(this.coords);
    // min/km
    // this.maxRange = this.coords;
    // return this;
    // this._setDescription(this.time);
  }
}

class Order extends Orders {
  inputType = 'order';

  constructor(coords) {
    super(coords);
    // this._setDescription(this.time);
  }
}

///////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerOrders = document.querySelector('.orders');
const input = document.querySelector('.form__input--type');
// const submitOrders = document.querySelector('.form__input');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  orders = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    // this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newOrder.bind(this)); // must always bind this keyword when calling local methods/functions inside of classes
    input.addEventListener('change', this._calcMaxRange.bind(this));
    containerOrders.addEventListener('submit', this._moveToPopup.bind(this));
    this._setRedisStorage(this.orders);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _getBase() {
    for (let i = 0; i < this.orders.length; i++) {
      if (this.orders[i].inputType === 'base') {
        return this.orders[i].coords;
      }
    }
  }
  // To calculate max range for orders from base location
  _calcMaxRange(coords1, coords2) {
    coords1 = this.#mapEvent.latlng;
    coords2 = this._getBase();
    var earthRadius = 6371;
    var dLat = this.deg2rad(coords2[0] - coords1.lat);
    var dLon = this.deg2rad(coords2[1] - coords1.lng);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(coords1.lat)) *
        Math.cos(this.deg2rad(coords2[0])) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = earthRadius * c; // Distance in km
    console.log(d);
    return d;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  _setRedisStorage(orders) {
    $('#add_button').click(function () {
      console.log(orders);
      $.ajax({
        url: '/orders/find-path',
        type: 'post',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({ orders: orders }),
      });
    });
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(latitude, longitude);
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // (coordinates, zoom level)
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.orders.forEach(order => {
      this._renderOrderMarker(order);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    // input.focus();
    // inputDistance.focus();
  }

  _hideForm() {
    // // Empty inputs
    // inputDistance.value =
    //   inputDuration.value =
    //   inputCadence.value =
    //   inputElevation.value =
    //     '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // _toggleElevationField() {
  //   inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  //   inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  // }

  _newOrder(e) {
    e.preventDefault();
    // console.log(this);

    // Get data from form
    const inputType = input.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let order;

    if (inputType == 'Base' && !this.orders.some(e => e.inputType == 'base')) {
      // const cadence = +inputCadence.value;

      order = new Base([lat, lng]);
    }

    // Catch edge case in the event user tries to add another base
    else if (
      inputType == 'Base' &&
      this.orders.some(e => e.inputType == 'base')
    ) {
      return alert('Only one Base may be submitted');
    }

    // If workout is order, create order object
    else if (inputType == 'Order') {
      // const elevation = +inputElevation.value;

      // if (
      //   !validInputs(distance, duration, elevation) ||
      //   !allPositive(distance, duration)
      // )
      //   return alert('Inputs have to be positive numbers');

      order = new Order([lat, lng]);
    }

    // Add new object to order array
    this.orders.push(order);

    // Render order on map as marker
    this._renderOrderMarker(order);

    // Render order on list
    this._renderOrder(order);

    // Hide form + Clear input fields
    this._hideForm();

    this._removeOrder(order, this.orders);

    // Set local storage to all orders
    // this._setLocalStorage();
  }

  _renderOrderMarker(order) {
    const myIcon = L.icon({
      iconUrl: 'https://img.icons8.com/pastel-glyph/512/pizza--v2.png',
      iconSize: [46, 46],
      iconAnchor: [22, 94],
      popupAnchor: [0, -90],
      className: `${order.id}`,
    });

    L.marker(order.coords, { icon: myIcon })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${order.inputType}-popup ${order.id}`,
        })
      )
      .setPopupContent(
        `${order.inputType === 'base' ? '🏃‍♂️' : '🚴‍♀️'} ${order.inputType}`
      )
      .openPopup();
  }

  // some DOM manipulation
  _renderOrder(order) {
    let html = `
    <li id="${order.id}" class="order order--${order.inputType}" data-id="${
      order.id
    }">
    <h2 class="order__title">${order.inputType}</h2>
    <div class="order__details">
    <span class="order__icon">${order.inputType === 'base' ? '🏃‍♂️' : '🚴‍♀️'}</span>
    </div>
    <button id="delete_button" type="submit">Remove</button>
    </li>
    `;
    // onclick="window.location.href='/orders/delete-order/{{order.pk}}'"
    form.insertAdjacentHTML('afterend', html);
  }

  // Delete an order
  _removeOrder(order, orders) {
    $('#delete_button').click(function () {
      const orderEl = document.getElementById(`${order.id}`);
      const popups = [...document.querySelectorAll('.leaflet-popup')];
      const markers = [...document.querySelectorAll('.leaflet-marker-icon')];

      const popup = popups.find(
        pop =>
          `leaflet-popup ${order.inputType}-popup ${order.id} leaflet-zoom-animated` ===
          pop.className
      );
      const marker = markers.find(
        mark =>
          mark.className ===
          `leaflet-marker-icon ${order.id} leaflet-zoom-animated leaflet-interactive`
      );
      // console.log(popup);
      // console.log(marker);
      orderEl.style.display = 'none';
      popup.style.display = 'none';
      marker.style.display = 'none';
      const index = orders.indexOf(order);
      orders.splice(index, 1);
    });
  }

  _moveToPopup(e) {
    const orderEl = e.target.closest('.order');
    if (!orderEl) return;
    const order = this.orders.find(order => order.id == orderEl.dataset.id);

    this.#map.setView(order.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // order.click();
  }

  _setLocalStorage() {
    localStorage.setItem('orders', JSON.stringify(this.orders));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('orders'));

    if (!data) return;

    this.orders = data;

    this.orders.forEach(order => {
      this._renderOrder(order);
    });
  }

  reset() {
    location.reload();
  }
}

const app = new App();