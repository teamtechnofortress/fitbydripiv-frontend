import dayjs from "dayjs";

/**
 * Return if user is logged in
 * This is completely up to you and how you want to store the token in your frontend application
 * e.g. If you are using cookies to store the application please update this function
 */
export const isUserLoggedIn = () => !!(localStorage.getItem('userData') && localStorage.getItem('accessToken'));

export const formDate = (dateStr) => dayjs(dateStr).format('YYYY-MM-DD HH:mm');

export function getDateString(date) {
    let tmp = new Date(date);
    if (isNaN(tmp)) {
      return "";
    } else {
      let d = new Date(date),
          month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear();
  
      if (month.length < 2)
        month = '0' + month;
      if (day.length < 2)
        day = '0' + day;
  
      return [day, month, year].join('/');
    }
}

export function getHumanDate(date) {
    if (date === null || date === undefined || date === "") {
        return "";
    } else {
        return dayjs(date).format('DD MMMM YYYY HH:mm');
    }
}

export function convertUTCDate(date, time="00:00"){
  if(date === null || date === undefined || date === ""){
    return "";
  }else{
    const localDateTimeStr = `${date}T${time}`;
    const localDate = new Date(localDateTimeStr);
    const utcDateString = localDate.toISOString();

    return utcDateString.slice(0, 19).replace('T', ' ');
  }
}