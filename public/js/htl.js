/***********************************************
    * A) TABS + FLATPICKR
    ***********************************************/
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tabContents.forEach((tc) => tc.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        document.getElementById(target).classList.add('active');
      });
    });

    if (typeof flatpickr !== 'undefined') {
      flatpickr('#dataIngresso', {
        locale: 'pt',
        dateFormat: 'd/m/Y',
        minDate: 'today',
        defaultDate: 'today'
      });
      flatpickr('#dataRangeHoteis', {
        locale: 'pt',
        mode: 'range',
        dateFormat: 'd/m/Y',
        showMonths: 2,
        minDate: 'today',
        allowInput: true
      });
    }

    /***********************************************
    * B) DROPDOWN DE QUARTOS E PESSOAS
    ***********************************************/
    const quartosInput = document.getElementById('quartos');
    const dropdown = document.getElementById('quartosDropdown');
    const roomsMinus = document.getElementById('roomsMinus');
    const roomsPlus = document.getElementById('roomsPlus');
    const roomsTotalEl = document.getElementById('roomsTotal');
    const roomsContainer = document.getElementById('roomsContainer');
    const applyQuartos = document.getElementById('applyQuartos');

    let roomsData = [{ adults: 2, children: 0, childAges: [] }];

    if (quartosInput) {
      quartosInput.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown) dropdown.classList.toggle('active');
      });
    }
    if (dropdown) {
      dropdown.addEventListener('click', (e) => e.stopPropagation());
    }
    document.addEventListener('click', () => {
      if (dropdown) dropdown.classList.remove('active');
    });

    function renderRooms() {
      if (!roomsContainer || !roomsTotalEl) return;
      roomsContainer.innerHTML = '';
      roomsTotalEl.textContent = roomsData.length;
      roomsData.forEach((room, index) => {
        const block = document.createElement('div');
        block.classList.add('qd-room-block');
        const title = document.createElement('div');
        title.className = 'qd-room-title';
        title.textContent = `Quarto ${index + 1}`;
        block.appendChild(title);
        const adRow = document.createElement('div');
        adRow.className = 'qd-row';
        adRow.innerHTML = `
          <span class="qd-label">Adultos</span>
          <div class="qd-counter">
            <button type="button" class="adultMinus">-</button>
            <span class="adultCount">${room.adults}</span>
            <button type="button" class="adultPlus">+</button>
          </div>
        `;
        block.appendChild(adRow);
        const chRow = document.createElement('div');
        chRow.className = 'qd-row';
        chRow.innerHTML = `
          <span class="qd-label">Crianças</span>
          <div class="qd-counter">
            <button type="button" class="childMinus">-</button>
            <span class="childCount">${room.children}</span>
            <button type="button" class="childPlus">+</button>
          </div>
        `;
        block.appendChild(chRow);
        const agesDiv = document.createElement('div');
        agesDiv.className = 'children-ages';
        room.childAges.forEach((ageVal, i2) => {
          const sel = document.createElement('select');
          sel.className = 'childAgeSelect';
          for (let a = 0; a <= 17; a++) {
            const opt = document.createElement('option');
            opt.value = a;
            opt.text = `${a} ano(s)`;
            sel.appendChild(opt);
          }
          sel.value = ageVal;
          sel.addEventListener('change', (ev) => {
            room.childAges[i2] = parseInt(ev.target.value, 10);
          });
          agesDiv.appendChild(sel);
        });
        block.appendChild(agesDiv);
        adRow.querySelector('.adultPlus').addEventListener('click', () => { room.adults++; renderRooms(); });
        adRow.querySelector('.adultMinus').addEventListener('click', () => { if (room.adults > 1) { room.adults--; renderRooms(); } });
        chRow.querySelector('.childPlus').addEventListener('click', () => { room.children++; room.childAges.push(0); renderRooms(); });
        chRow.querySelector('.childMinus').addEventListener('click', () => { if (room.children > 0) { room.children--; room.childAges.pop(); renderRooms(); } });
        roomsContainer.appendChild(block);
      });
    }
    if (roomsPlus) {
      roomsPlus.addEventListener('click', () => { roomsData.push({ adults: 2, children: 0, childAges: [] }); renderRooms(); });
    }
    if (roomsMinus) {
      roomsMinus.addEventListener('click', () => { if (roomsData.length > 1) { roomsData.pop(); renderRooms(); } });
    }
    if (applyQuartos) {
      applyQuartos.addEventListener('click', () => {
        let totalA = 0, totalC = 0;
        roomsData.forEach((r) => {
          totalA += r.adults;
          totalC += r.children;
        });
        if (quartosInput) { quartosInput.value = `${roomsData.length} Quarto(s), ${totalA} Adulto(s), ${totalC} Criança(s)`; }
        if (dropdown) dropdown.classList.remove('active');
      });
    }
    renderRooms();

    /***********************************************
    * C) CRIAÇÃO DE CARD E FUNÇÕES
    ***********************************************/
    function formatPriceBRL(value) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    const priorityFacilities = ['Wi-fi', 'Gym', 'Pool', 'Parking'];
    function convertDistanceToKm(distStr) {
      const meters = parseFloat(distStr) || 0;
      const km = meters / 1000;
      return km.toFixed(1).replace('.', ',') + ' km';
    }
    function createHotelCard(hotelData) {
      const template = document.getElementById('hotelCardTemplate');
      if (!template) return document.createDocumentFragment();
      const clone = template.content.cloneNode(true);
      clone.querySelector('.hotel-card').setAttribute('data-hotel-id', hotelData.code);
      clone.querySelector('.hotel-name').textContent = hotelData.name || '';
      clone.querySelector('.hotel-address').textContent = hotelData.address || '';
      clone.querySelector('.days-nights').textContent = hotelData.daysNights || '';
      clone.querySelector('.price-starting').textContent = hotelData.priceFrom || '';
      clone.querySelector('.ten-installments').textContent = hotelData.installments || '';
      const starEl = clone.querySelector('.stars');
      starEl.innerHTML = '';
      const r = Math.round(hotelData.ratingStars || 0);
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        if (i <= r) star.classList.add('fas', 'fa-star');
        else star.classList.add('far', 'fa-star', 'empty');
        starEl.appendChild(star);
      }
      clone.querySelector('.rating-value').textContent = hotelData.ratingValue || '';
      let facArr = hotelData.facilities || [];
      facArr.sort((a, b) => {
        const aIndex = priorityFacilities.findIndex((p) => a.toLowerCase().includes(p.toLowerCase()));
        const bIndex = priorityFacilities.findIndex((p) => b.toLowerCase().includes(p.toLowerCase()));
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      facArr = facArr.slice(0, 3);
      const facDiv = clone.querySelector('.facility-icons');
      facArr.forEach((f) => {
        let foundKey = null;
        if (window.facilitiesMap && window.facilitiesMap[f]) {
          foundKey = f;
        } else if (window.facilitiesMap) {
          for (const k in window.facilitiesMap) {
            if (f.toLowerCase().includes(k.toLowerCase())) {
              foundKey = k;
              break;
            }
          }
        }
        const iconDiv = document.createElement('div');
        iconDiv.className = 'facility-icon';
        if (foundKey) {
          const found = window.facilitiesMap[foundKey];
          iconDiv.innerHTML = found.svg;
          const tt = document.createElement('div');
          tt.className = 'tooltip';
          tt.textContent = found.pt;
          iconDiv.appendChild(tt);
        } else {
          iconDiv.innerHTML = `<i class="fas fa-check"></i>`;
          const tt = document.createElement('div');
          tt.className = 'tooltip';
          tt.textContent = f;
          iconDiv.appendChild(tt);
        }
        facDiv.appendChild(iconDiv);
      });
      const poiUl = clone.querySelector('.poi-list');
      (hotelData.poiList || [])
        .slice(0, 3)
        .forEach((p) => {
          const li = document.createElement('li');
          li.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${p.poiName} - ${convertDistanceToKm(p.distance)}`;
          poiUl.appendChild(li);
        });
      const track = clone.querySelector('.carousel-track');
      let currentSlide = 0;
      (hotelData.images || []).forEach((url) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.innerHTML = `<img loading="lazy" src="${url}" alt="Foto do Hotel">`;
        track.appendChild(slide);
      });
      const prevBtn = clone.querySelector('.prev-button');
      const nextBtn = clone.querySelector('.next-button');
      function updateCarousel() {
        const slides = track.querySelectorAll('.carousel-slide');
        if (!slides.length) return;
        const w = slides[0].getBoundingClientRect().width;
        track.style.transform = `translateX(-${currentSlide * w}px)`;
      }
      prevBtn.addEventListener('click', () => {
        const slides = track.querySelectorAll('.carousel-slide');
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        updateCarousel();
      });
      nextBtn.addEventListener('click', () => {
        const slides = track.querySelectorAll('.carousel-slide');
        currentSlide = (currentSlide + 1) % slides.length;
        updateCarousel();
      });
      window.addEventListener('resize', updateCarousel);
      return clone;
    }

    /***********************************************
    * D) EVENTO PARA ENVIAR OS DADOS PARA A PÁGINA DE DETALHES
    ***********************************************/
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.btn-options, .select-room-button');
      if (!btn) return;
      const card = btn.closest('.hotel-card');
      if (!card) return;
      const hotelCode = card.getAttribute('data-hotel-id');
      if (!hotelCode) {
        console.error('Código do hotel não encontrado no card.');
        return;
      }
      const dateRange = document.getElementById('dataRangeHoteis')?.value || '';
      let checkIn = '', checkOut = '';
      if (dateRange) {
        const dates = dateRange.split(' - ');
        checkIn = dates[0] || '';
        checkOut = dates[1] || '';
      }
      checkIn = convertDateFormat(checkIn);
      checkOut = convertDateFormat(checkOut);
      let totalRooms = roomsData.length;
      let totalAdults = 0, totalChildren = 0;
      roomsData.forEach((room) => {
        totalAdults += room.adults;
        totalChildren += room.children;
      });
      const searchParams = {
        hotelCode: hotelCode,
        checkIn: checkIn,
        checkOut: checkOut,
        rooms: totalRooms,
        adults: totalAdults,
        children: totalChildren,
      };
      const queryString = new URLSearchParams(searchParams).toString();
      window.location.href = 'hoteldetails.html?' + queryString;
    });

    /***********************************************
    * E) FUNÇÕES PARA BUSCAR HOTÉIS E PAGINAÇÃO
    ***********************************************/
    async function buscarHoteis() {
      const destination = document.getElementById('destinoHoteisCode')?.value || document.getElementById('destinoHoteis')?.value || 'MCO';
      const range = document.getElementById('dataRangeHoteis')?.value || '';
      const hotelsListEl = document.getElementById('hotelsList');
      const statusEl = document.getElementById('status');
      const paginationEl = document.getElementById('pagination');

      if (!range) {
        alert('Selecione as datas!');
        return;
      }

      // Exibe o painel de filtros somente após o clique em "Buscar Hotéis"
      showFiltersPanel();

      function toISO(dmy) {
        const [d, m, y] = dmy.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      let checkIn = '', checkOut = '';
      const parts = range.split(' ');
      if (parts.length >= 2) {
        checkIn = parts[0];
        checkOut = parts[2] || parts[1];
      }
      const isoIn = toISO(checkIn);
      const isoOut = toISO(checkOut);

      let query = `?checkIn=${isoIn}&checkOut=${isoOut}&destination=${destination}&rooms=${roomsData.length}&page=1&limit=20`;
      roomsData.forEach((r, i) => {
        const idx = i + 1;
        query += `&adults${idx}=${r.adults}&children${idx}=${r.children}`;
      });

      if (hotelsListEl) hotelsListEl.innerHTML = '';
      if (paginationEl) {
        paginationEl.innerHTML = '';
        paginationEl.style.display = 'none';
      }
      if (statusEl) {
        statusEl.textContent = 'Carregando hotéis...';
        statusEl.style.display = 'block';
      }

      const url = `/api/hotelbeds/hotels${query}`;
      console.log('API de Hotéis:', url);

      try {
        const bookingResp = await fetch(url);
        if (!bookingResp.ok) {
          throw new Error('Booking API Error: ' + bookingResp.status);
        }
        const bookingData = await bookingResp.json();
        let hotelsArr = bookingData.hotels?.hotels || [];

        // Filtro: Buscar por nome da propriedade (automaticamente)
        const propertyNameFilter = document.getElementById('propertyName')?.value.trim().toLowerCase();
        if (propertyNameFilter) {
          hotelsArr = hotelsArr.filter(hotel => hotel.name.toLowerCase().includes(propertyNameFilter));
        }

        // Filtro: Por estrelas (extraindo o número de estrelas da categoryName)
        const starCheckboxes = document.querySelectorAll('.filter-group input[type="checkbox"][value]');
        const selectedStars = Array.from(starCheckboxes)
          .filter(cb => cb.checked)
          .map(cb => parseInt(cb.value, 10));
        if (selectedStars.length > 0) {
          hotelsArr = hotelsArr.filter(hotel => {
            if (!hotel.categoryName) return false;
            const stars = parseInt(hotel.categoryName, 10);
            return selectedStars.includes(stars);
          });
        }

        if (!hotelsArr.length) {
          if (statusEl) statusEl.textContent = 'Nenhum hotel encontrado.';
          return;
        }
        if (statusEl) statusEl.style.display = 'none';

        for (const hotel of hotelsArr) {
          const code = hotel.code;
          const contentResp = await fetch(`/api/hotelbeds/hotel-content?hotelCode=${code}`);
          if (!contentResp.ok) {
            console.warn('Falha ao buscar content do hotel:', code);
            continue;
          }
          const contentData = await contentResp.json();
          const content = contentData?.hotel || {};
          const name = content.name?.content || hotel.name || 'Sem Nome';
          const street = content.address?.street || '';
          const city = content.city?.content || '';
          let addressFull = street;
          if (city) {
            addressFull += addressFull ? `, ${city}` : city;
          }
          let ratingNum = 0;
          if (hotel.categoryCode) {
            const mm = hotel.categoryCode.match(/\d+/);
            if (mm) ratingNum = parseInt(mm[0], 10);
          } else if (hotel.categoryName) {
            const mm2 = hotel.categoryName.match(/\d+(\.\d+)?/);
            if (mm2) ratingNum = parseFloat(mm2[0]);
          }
          if (!ratingNum) ratingNum = 3;
          let priceLabel = 'A partir de R$ ???';
          if (hotel.minRate != null) {
            const pr = parseFloat(hotel.minRate);
            if (!isNaN(pr)) {
              priceLabel = 'A partir de ' + formatPriceBRL(pr);
            }
          }
          let facArr = (content.facilities || []).map((f) => f.description?.content || '');
          let poiArr = [];
          if (content.interestPoints?.length) {
            poiArr = content.interestPoints.map((ip) => ({
              poiName: ip.poiName || 'Ponto de Interesse',
              distance: ip.distance || '0',
            }));
          }
          let imagesArr = [];
          if (content.images?.length) {
            const roomImgs = content.images.filter((img) => img.type?.code === 'HAB');
            const arr = roomImgs.length ? roomImgs : content.images;
            imagesArr = arr.map((img) => `https://photos.hotelbeds.com/giata/xl/${img.path}`);
          } else {
            imagesArr = ['https://dummyimage.com/300x200/ccc/000.png&text=No+Image'];
          }
          let daysNightsLabel = '';
          if (checkIn && checkOut) {
            const parseDmy = (dmy) => {
              const [D, M, A] = dmy.split('/');
              return new Date(+A, +M - 1, +D);
            };
            const d1 = parseDmy(checkIn);
            const d2 = parseDmy(checkOut);
            const ms = d2 - d1;
            if (ms > 0) {
              const diffDays = Math.round(ms / (1000 * 60 * 60 * 24));
              daysNightsLabel = `${diffDays} dia(s), ${Math.max(diffDays - 1, 1)} noite(s)`;
            }
          }
          const hotelObj = {
            code: code,
            name: name,
            address: addressFull,
            ratingStars: ratingNum,
            ratingValue: ratingNum.toString(),
            images: imagesArr,
            daysNights: daysNightsLabel,
            priceFrom: priceLabel,
            installments: 'Até 10x sem juros',
            facilities: facArr,
            poiList: poiArr,
          };
          const cardEl = createHotelCard(hotelObj);
          hotelsListEl?.appendChild(cardEl);
        }
      } catch (e) {
        console.error(e);
        if (statusEl) statusEl.textContent = 'Erro ao buscar hotéis. Ver console.';
      }
    }

    function exibirPaginacao(totalPages, currentPage) {
      const pagEl = document.getElementById('pagination');
      if (!pagEl || totalPages <= 1) return;
      pagEl.style.display = 'flex';
      if (currentPage > 1) {
        const btnPrev = document.createElement('button');
        btnPrev.textContent = 'Anterior';
        pagEl.appendChild(btnPrev);
      }
      if (currentPage < totalPages) {
        const btnNext = document.createElement('button');
        btnNext.textContent = 'Próxima Página';
        pagEl.appendChild(btnNext);
      }
    }

    function convertDateFormat(dateStr) {
      const [d, m, a] = dateStr.split('/');
      return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    /***********************************************
    * FUNÇÃO PARA EXIBIR O PAINEL DE FILTROS
    * O painel inicia oculto e só é exibido após o clique em "Buscar Hotéis"
    ***********************************************/
    function showFiltersPanel() {
      const panel = document.getElementById('filtersPanel');
      // Remove a classe "hidden" e adiciona "visible" para acionar a animação
      panel.classList.remove('hidden');
      panel.classList.add('visible');
    }

    /***********************************************
    * TOGGLE DE FILTROS NO MOBILE
    ***********************************************/
    function toggleFilters() {
      const panel = document.getElementById('filtersPanel');
      panel.classList.toggle('active');
    }

    /***********************************************
    * Otimização: Exibe o conteúdo somente após o carregamento completo
    ***********************************************/
    // Carrega o conteúdo de "loading.html" para o overlay
    document.addEventListener('DOMContentLoaded', function () {
      fetch('loading.html')
        .then((response) => {
          if (response.ok) return response.text();
          else throw new Error('Arquivo não encontrado');
        })
        .then((html) => {
          document.getElementById('loading-overlay').innerHTML = html;
        })
        .catch((err) => console.error('Erro ao carregar loading.html:', err));
    });

    // Exibe o conteúdo principal após o evento "load", fontes prontas e a próxima frame renderizada
    window.addEventListener('load', function () {
      Promise.all([document.fonts.ready]).then(() => {
        requestAnimationFrame(() => {
          document.getElementById('loading-overlay').style.display = 'none';
          document.getElementById('hotelDetail').style.display = 'block';
        });
      });
    });
