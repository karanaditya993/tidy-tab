(()  => {
  const GET_DOMAIN_REGEX  = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img
  let observer
  let tabsData            = []

  const getDomainFromUrl = (url) => {
    const a = document.createElement('a')
    a.className = 'delete'
    a.setAttribute('href', url);
    return a.hostname;
  }

  const partitionTabs = (tabs, isRemoving) => {
    if (isRemoving) { tabsData = [] }
    tabs.map((tab) => {
      const matchedUrl = tab.url.match(GET_DOMAIN_REGEX)[0]
      const sameTab    = tabsData.find(t => t.url === matchedUrl)
      if (sameTab) {
        sameTab.tabIds.push(tab.id)
      } else {
        tabsData.push({
          icon: tab.favIconUrl,
          name: getDomainFromUrl(tab.url),
          tabIds: [tab.id],
          url: matchedUrl,
        })
      }
    })
    tabsData = tabsData.sort((tab1, tab2) => tab2.tabIds.length - tab1.tabIds.length)
    // resetHTML
    if (isRemoving) {
      document.getElementsByClassName('list-tabs')[0].innerHTML = ''
      document.getElementsByClassName('grid-tabs')[0].innerHTML = ''
      observer.disconnect()
      addMutationListener('list-tabs')
      addMutationListener('grid-tabs')
    }
    renderTabList()
  }

  const getBadgeColor = (numTabs) => {
    let color
    const badgeColors = {
      low: {
        threshold: [1, 1],
        color: '#e6e6e6' 
      },
      few: {
        threshold: [2, 2],
        color: '#d3d3d3' 
      },
      couple: {
        threshold: [3, 3],
        color: '#c3c3c4'
      },
      many: {
        threshold: [4, Infinity],
        color: '#b2b2b3'
      }
    }

    Object.values(badgeColors).map(badge => {
      if (numTabs >= badge.threshold[0] && numTabs <= badge.threshold[1]) {
        color = badge.color
      }
    })
    return color
  }

  const isOnListView = () => (
    document.getElementById('list-container').style.display !== 'none'
    && document.getElementsByClassName('list-tabs')[0].children.length !== tabsData.length
  )

  const isOnGridView = () => (
    document.getElementById('grid-container').style.display !== 'none'
        && document.getElementsByClassName('grid-tabs')[0].children.length !== tabsData.length
  )

  const renderTabList = () => {
    tabsData.map((tab) => {
      let tabsEl
      let badgeEl       = document.createElement('div')
      let tabEl         = document.createElement('div')
      tabEl.className   = 'tab'
      badgeEl.className = 'tab-badge-icon'
      const favicon        = document.createElement('img')

      favicon.src       = tab.icon
      favicon.className = 'tab-icon'
      favicon.onerror   = () => {
        favicon.src        = 'assets/images/chrome-logo.png'
      }

      if (isOnListView()) {
        tabsEl            = document.getElementsByClassName('list-tabs')[0]
        const label       = document.createElement('div')

        tabEl.dataset.tabIds = tab.tabIds.join(',')

        label.className   = 'tab-label'
        label.innerHTML   = `<span class="tab-name">${tab.name}</span>`

        badgeEl.innerHTML = `<span class="badge-text">${tab.tabIds.length}</span> <i class="close-tab material-icons">close</i>`
        badgeEl.style.backgroundColor = getBadgeColor(tab.tabIds.length)

        tabEl.appendChild(favicon)
        tabEl.appendChild(label)
      } else if (isOnGridView()) {
        tabsEl               = document.getElementsByClassName('grid-tabs')[0]

        tabEl.dataset.tabIds = tab.tabIds.join(',')

        badgeEl.className = 'num-badge'
        badgeEl.innerHTML = `<span class="badge-text">${tab.tabIds.length}</span> <i class="close-tab material-icons">close</i>`
        badgeEl.style.backgroundColor = getBadgeColor(tab.tabIds.length)

        tabEl.style.backgroundRepeat = 'no-repeat'
        tabEl.style.backgroundSize = 'cover'
        
        tabEl.appendChild(favicon)
        tabEl.appendChild(badgeEl)
      }
      tabEl && tabEl.appendChild(badgeEl)
      tabsEl && tabsEl.appendChild(tabEl)
    })
  }

  const toggleIconListeners = () => {
    const icons = document.querySelectorAll('.material-icons')
    icons[0].addEventListener('click', () => {
      const url = new URL(window.location.href)
      window.history.replaceState(null, '', url.href);
      if (!icons[0].classList.contains('dark')) {
        document.body.classList.add('dark')
        icons[0].classList.add('dark')
      } else {
        document.body.classList.remove('dark')
        icons[0].classList.remove('dark')
      }
    });

    icons[1].addEventListener('click', () => {
      icons[1].classList.add('active')
      icons[2].classList.remove('active')
      document.getElementById('grid-container').style.display = 'none'
      document.getElementById('list-container').style.display = 'block'
      renderTabList()
    });

    icons[2].addEventListener('click', () => {
      icons[2].classList.add('active')
      icons[1].classList.remove('active')
      document.getElementById('grid-container').style.display = 'block'
      document.getElementById('list-container').style.display = 'none'
      renderTabList()
    });
  }

  const addMutationListener = (containerSelector) => {
    let tabCloseIcons
    const targetNode = document.getElementsByClassName(containerSelector)[0]
    observer   = new MutationObserver(() => {
      if (!tabCloseIcons) {
        tabCloseIcons = [...document.querySelectorAll('.tab')]
        tabCloseIcons.map((icon) => {
          icon.addEventListener('click', (el) => {
            const tabEl = el.target.closest('.tab')
            const tabIds = tabEl.dataset.tabIds.split(',').map(val => Number(val))
            chrome.tabs.remove(tabIds, () => {
              observer.disconnect()
              chrome.tabs.query({}, (tabs) => {
                partitionTabs(tabs, true)
              })
            })
          })
        })
      }
    })
    observer.observe(targetNode, { childList: true })
  }

  const addListeners = () => {
    toggleIconListeners()
    addMutationListener('list-tabs')
    addMutationListener('grid-tabs')
  }

  window.onload = () => {
    addListeners()
    chrome.tabs.query({}, partitionTabs)
  }
})()
