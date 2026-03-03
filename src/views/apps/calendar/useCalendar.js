
import { usePatientDataStore } from '@/store/patientData'
import { useCalendarStore } from '@/views/apps/calendar/useCalendarStore'
import { useThemeConfig } from '@core/composable/useThemeConfig'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useToast } from 'vue-toastification'

const patientDataStore = usePatientDataStore();
const {patientList, loading, error} = storeToRefs(patientDataStore);

patientDataStore.getAllPatient();

export const blankEvent = {
  title: '',
  start: '',
  end: '',
  allDay: false,
  url: '',
  extendedProps: {
    /*
          ℹ️ We have to use undefined here because if we have blank string as value then select placeholder will be active (moved to top).
          Hence, we need to set it to undefined or null
        */
    calendar: undefined,
    guests: [],
    location: '',
    description: '',
    goal: '',
    treatment: '',
  },
}

export const useCalendar = (event, isEventHandlerSidebarActive, isLeftSidebarOpen, businessHours) => {
  // 👉 themeConfig
  const { isAppRtl } = useThemeConfig()

  // 👉 Store
  const store = useCalendarStore()
  const toast = useToast()
  
  // 👉 Calendar template ref
  const refCalendar = ref()


  // 👉 Calendar colors
  const calendarsColor = {
    Business: 'primary',
    Holiday: 'success',
    Personal: 'error',
    Family: 'warning',
    ETC: 'info',
  }


  // ℹ️ Extract event data from event API
  const extractEventDataFromEventApi = eventApi => {
    const { id, title, start, end, url, extendedProps: { calendar, guests, location, description, staff_id, goal, treatment }, allDay } = eventApi
    
    return {
      id,
      title,      
      start,
      end,
      url,
      extendedProps: {
        calendar,
        guests,
        location,
        description,
        staff_id,
        goal,
        treatment
      },
      allDay,
    }
  }


  // 👉 Fetch events
  const fetchEvents = (info, successCallback) => {
    // If there's no info => Don't make useless API call
    if (!info)
      return
    store.fetchEvents(info)
      .then(r => {
        successCallback(r.value.map(e => ({
          id: e.id,
          staff_id: e.staff_id,
          title: e.patient_name,
          allDay: false,//e.isAllDay,
          url: 'http://eliminated.com',//e.url,

          // Convert string representation of date to Date object
          
          start: new Date(e.start),
          end: new Date(e.end),
          extendedProps: {
            calendar: 'Business',//e.label
            guests: ['guests'],//e.guests.split(','),
            location: 'location', //e.location,
            description: e.description,
            goal: e.goal,
            treatment: e.treatment
          },
        })))
      })
      .catch(e => {
        console.error('Error occurred while fetching calendar events', e)
      })
  }


  // 👉 Calendar API
  const calendarApi = ref(null)


  // 👉 Update event in calendar [UI]
  const updateEventInCalendar = (updatedEventData, propsToUpdate, extendedPropsToUpdate) => {
    const existingEvent = calendarApi.value?.getEventById(updatedEventData.id)
    if (!existingEvent) {
      console.warn('Can\'t found event in calendar to update')
      
      return
    }

    // ---Set event properties except date related
    // Docs: https://fullcalendar.io/docs/Event-setProp
    // dateRelatedProps => ['start', 'end', 'allDay']
    for (let index = 0; index < propsToUpdate.length; index++) {
      const propName = propsToUpdate[index]

      existingEvent.setProp(propName, updatedEventData[propName])
    }

    // --- Set date related props
    // ? Docs: https://fullcalendar.io/docs/Event-setDates
    existingEvent.setDates(updatedEventData.start, updatedEventData.end, { allDay: updatedEventData.allDay })

    // --- Set event's extendedProps
    // ? Docs: https://fullcalendar.io/docs/Event-setExtendedProp
    for (let index = 0; index < extendedPropsToUpdate.length; index++) {
      const propName = extendedPropsToUpdate[index]

      existingEvent.setExtendedProp(propName, updatedEventData.extendedProps[propName])
    }
  }


  // 👉 Remove event in calendar [UI]
  const removeEventInCalendar = eventId => {
    const _event = calendarApi.value?.getEventById(eventId)
    if (_event)
      _event.remove()
  }


  // 👉 refetch events
  const refetchEvents = () => {
    calendarApi.value?.refetchEvents()
  }

  watch(() => store.selectedCalendars, refetchEvents)

  watch(() => store.selectedStaffs, refetchEvents)

  // 👉 Add event
  const addEvent = _event => {
    store.addEvent(_event)
      .then(() => {
        refetchEvents()
      })
  }


  // 👉 Update event
  const updateEvent = _event => {
    store.updateEvent(_event)
      .then(r => {

        let rval = {
          id: r.value.id,
          staff_id: r.value.staff_id,
          title: r.value.patient_name,
          allDay: false,//r.value.isAllDay,
          url: 'testurl',//r.value.url,

          // Convert string representation of date to Date object
          
          start: new Date(r.value.start),
          end: new Date(r.value.end),
          extendedProps: {
            calendar: 'Business',//r.value.label,
            guests: ['guests'],//r.value.guests.split(','),
            location: 'location',//r.value.location,
            description: r.value.description,
            goal: r.value.goal,
            treatment: r.value.treatment
          },
        }
        const propsToUpdate = ['id', 'title', 'url']
        const extendedPropsToUpdate = ['calendar', 'guests', 'location', 'description', 'goal', 'treatment']

        
        updateEventInCalendar(rval, propsToUpdate, extendedPropsToUpdate)
      })
  }


  // 👉 Remove event
  const removeEvent = eventId => {
    store.removeEvent(eventId).then(() => {
      removeEventInCalendar(eventId)
    })
  }

  function renderEventContent(arg) {
    const event = arg.event;

    // Example icon logic based on event.extendedProps.type
    let icon = '';
    let allergy = "None";
    switch (event.extendedProps.goal) {
      case 'INJECTABLES':
        icon = '💉';
        break;
      case 'IV':
        icon = '🧪';
        break;
      case 'WEIGHT LOSS':
        icon = '🏃‍♂️';
        break;
      case 'OTHERS':
        icon = '📋';
        break;
      default:
        icon = '📅';
    }
    //console.log(event.extendedProps.goal, event.title)
    allergy = patientList.value.filter(
      patient => `${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}` === event.title
      )?.[0]?.current_allergies;
      
    return {
      domNodes: [
        createElementWithHTML(`
          <div style="display: flex; flex-direction: column; font-size: 1em;">
            <div style="
              display: flex; 
              align-items: center; 
              gap: 5px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            ">
              <span>${icon}</span>
              <strong>${event.title}</strong>
            </div>
            ${allergy !== "None" ? `<div style="
                                      color: red;
                                      font-size: 1em;
                                      overflow: hidden;
                                      text-overflow: ellipsis;
                                      white-space: nowrap;
                                      max-width: 100%;
                                    ">⚠ ${allergy}</div>` : ''}
            </div>
        `)
      ]
    };
  }

  // Helper to create DOM node from HTML string
  function createElementWithHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  }

  // 👉 Calendar options
  const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin, listPlugin],
    initialView: 'timeGridWeek',
    slotMinTime: businessHours.value?.start_time,
    slotMaxTime: businessHours.value?.end_time,
    headerToolbar: {
      start: 'drawerToggler,prev,next title',
      end: 'timeGridWeek,timeGridDay',
    },
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      meridiem: 'short',
      hour12: true
    },
    events: fetchEvents,
    eventContent: renderEventContent,
    // ❗ We need this to be true because when its false and event is allDay event and end date is same as start data then Full calendar will set end to null
    forceEventDuration: true,

    /*
        Enable dragging and resizing event
        Docs: https://fullcalendar.io/docs/editable
      */
    editable: true,

    /*
        Enable resizing event from start
        Docs: https://fullcalendar.io/docs/eventResizableFromStart
      */
    eventResizableFromStart: true,

    /*
        Automatically scroll the scroll-containers during event drag-and-drop and date selecting
        Docs: https://fullcalendar.io/docs/dragScroll
      */
    dragScroll: true,

    /*
        Max number of events within a given day
        Docs: https://fullcalendar.io/docs/dayMaxEvents
      */
    dayMaxEvents: 2,

    /*
        Determines if day names and week names are clickable
        Docs: https://fullcalendar.io/docs/navLinks
      */
    navLinks: true,
    eventClassNames({ event: calendarEvent }) {
      const colorName = store.availableColors[calendarEvent._def.extendedProps.staff_id % 7]
      
      return [
        // Background Color
        `bg-light-${colorName} text-${colorName}`,
      ]
    },
    eventClick({ event: clickedEvent, jsEvent: jsEvent }) {
      // * Only grab required field otherwise it goes in infinity loop
      // ! Always grab all fields rendered by form (even if it get `undefined`) otherwise due to Vue3/Composition API you might get: "object is not extensible"
      event.value = extractEventDataFromEventApi(clickedEvent)
      jsEvent.preventDefault()
      
      const userData = JSON.parse(localStorage.getItem('userData'))

      if(userData.role == 'admin') store.isAdmin = true
      else{
        store.isAdmin = false
      }

      if ((event.value.extendedProps.staff_id == userData.id) || (userData.role == 'admin')){
        isEventHandlerSidebarActive.value = true
      }else {
        event.value = structuredClone(blankEvent)
        toast.error("You can't edit other staff's appointment")
      }      
    },

    // customButtons
    // dateClick(info) {
    //   event.value = { ...event.value, start: new Date(info.date) }
    //   console.log("clickdate", info, event)
    //   isEventHandlerSidebarActive.value = true
    // },

    //For Time Range Selection in Time Grid 
    selectable: true,
    select(info){
      const userData = JSON.parse(localStorage.getItem('userData'))

      if(userData.role == 'admin') {
        store.isAdmin = true
      }
      else{
        store.isAdmin = false
      }
      event.value = { ...event.value, start: new Date(info.start), end: new Date(info.end), allDay: info.allDay }
      isEventHandlerSidebarActive.value = true
    },

    /*
          Handle event drop (Also include dragged event)
          Docs: https://fullcalendar.io/docs/eventDrop
          We can use `eventDragStop` but it doesn't return updated event so we have to use `eventDrop` which returns updated event
        */
    eventDrop({ event: droppedEvent, jsEvent: jsEvent }) {
      event.value = extractEventDataFromEventApi(droppedEvent)
      jsEvent.preventDefault()
      
      const userData = JSON.parse(localStorage.getItem('userData'))

      if ((event.value.extendedProps.staff_id == userData.id) || (userData.role == 'admin'))
      {
        updateEvent(extractEventDataFromEventApi(droppedEvent))
      }
      else {
        toast.error("You can't edit other staff's appointment")
      }

      event.value = structuredClone(blankEvent)
      
    },

    /*
          Handle event resize
          Docs: https://fullcalendar.io/docs/eventResize
        */
    eventResize({ event: resizedEvent, jsEvent: jsEvent }) {
      event.value = extractEventDataFromEventApi(resizedEvent)
      jsEvent.preventDefault()
      
      const userData = JSON.parse(localStorage.getItem('userData'))

      if ((event.value.extendedProps.staff_id == userData.id) || (userData.role == 'admin'))
      {
        if (resizedEvent.start && resizedEvent.end)
          updateEvent(extractEventDataFromEventApi(resizedEvent))
      }
      else {
        
        toast.error("You can't edit other staff's appointment")
      }      
      event.value = structuredClone(blankEvent)
    },

    eventAllow: function(dropInfo, draggedEvent) {
      // Block drag/resize for events not created by the current user
      const createdBy = draggedEvent.extendedProps.staff_id

      const userData = JSON.parse(localStorage.getItem('userData'))
      
      return (createdBy === userData.id) || (userData.role == "admin") // Only allow if user is owner
    },

    customButtons: {
      drawerToggler: {
        text: 'calendarDrawerToggler',
        click() {
          isLeftSidebarOpen.value = true
        },
      },
    },
  }))


  // 👉 onMounted
  onMounted(async () => {
    calendarApi.value = refCalendar.value?.getApi()
  })


  // 👉 Jump to date on sidebar(inline) calendar change
  const jumpToDate = currentDate => {
    calendarApi.value?.gotoDate(new Date(currentDate))
  }

  watch(isAppRtl, val => {
    calendarApi.value?.setOption('direction', val ? 'rtl' : 'ltr')
  }, { immediate: true })
  
  return {
    refCalendar,
    calendarOptions,
    refetchEvents,
    fetchEvents,
    addEvent,
    updateEvent,
    removeEvent,
    jumpToDate,
  }
}
