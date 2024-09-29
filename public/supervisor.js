    
    
   //LEADERBOARDS
  function showDutyHours(){
    var dutyH = document.getElementById('dutyH');
    var FireR = document.getElementById('FireR');
    var frmFireResponse = document.getElementById('frmFireResponse');
    var frmDutyhours = document.getElementById('frmDutyhours');
    frmDutyhours.style.display = 'block';
    frmFireResponse.style.display = 'none';
    dutyH.classList.add('bg-red-700','text-white');
    FireR.classList.remove('bg-red-700','text-white');
    dutyH.classList.add('text-black');
    }

  function showFireRes(){
    var dutyH = document.getElementById('dutyH');
    var FireR = document.getElementById('FireR');
    var frmFireResponse = document.getElementById('frmFireResponse');
    var frmDutyhours = document.getElementById('frmDutyhours');
    frmFireResponse.style.display = 'block';
    frmDutyhours.style.display = 'none';
    FireR.classList.add('bg-red-700','text-white');
    dutyH.classList.remove('bg-red-700','text-white');
    FireR.classList.add('text-black');
    }



// FIRE RESPONSE ICS
// function addthis(){
//     var addPer = document.getElementById('addPer');
//     addPer.style.display = 'block';
// }
// function canaddPerson(){
//     var canAdd = document.getElementById('addPer');
//     canAdd.style.display = 'none';
// }
// function ConfirmAdd(){
//     var AddResponse = document.getElementById('AddResponse');
//     var InciSys = document.getElementById('InciSys');
//     InciSys.style.display = 'block';
//     AddResponse.style.display = 'none';
// }
// function icsDone(){
//     var fireresponseform = document.getElementById('fireresponseform');
//     var InciSys = document.getElementById('InciSys');
//     fireresponseform.style.display = 'block';
//     InciSys.style.display = 'none';
    
// }
// function addthis1(){
//     var addPer = document.getElementById('addPer1');
//     addPer.style.display = 'block';
// }
// function canaddPerson1(){
//     var canAdd = document.getElementById('addPer1');
//     canAdd.style.display = 'none';
// }
// function fireclose(){
//     var firelog = document.getElementById('firelog');
//     firelog.style.display = 'none';
// }


// function icsSubmit(){
//     var fireresponseform = document.getElementById('fireresponseform');
//     var frmFireResponse = document.getElementById('frmFireResponse');
//     frmFireResponse.style.display = 'block';
//     fireresponseform.style.display = 'none';
// }

// function AddFireResponse(){
//     var AddResponse = document.getElementById('AddResponse');
//     var frmFireResponse = document.getElementById('frmFireResponse');
//     AddResponse.style.display = 'block';
//     frmFireResponse.style.display = 'none';
// }
// function seedetails(){
//     var firelog = document.getElementById('firelog');
//     firelog.style.display = 'block';
// }



document.addEventListener('DOMContentLoaded', function() {
    animateProgressBar(70);
    animateProgressBar2(40);

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(event) {
            event.preventDefault();
            const confirmLogout = confirm("Are you sure you want to log out?");
            if (confirmLogout) {
                window.location.href = 'index.html';
            }
        });
    }

    const circles = document.querySelectorAll('.colorCircle');
    circles.forEach(circle => {
        circle.addEventListener('click', function () {
            circle.classList.toggle('bg-red-500');
            circle.classList.toggle('bg-green-500');
        });
    });
});

function animateProgressBar(targetWidth) {
  
    const progressBar = document.getElementById('progress');
    if (progressBar) {
      progressBar.style.width = targetWidth + '%';
    }
  }
  
  function animateProgressBar2(targetWidth) {
    const progressBar2 = document.getElementById('progress2');
    if (progressBar2) {
      progressBar2.style.width = targetWidth + '%';
    }
  }
  

//test
document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth' 
    });

    calendar.render();
});

//FOR RESPONSIVE

document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');



    menuToggle.addEventListener('click', function () {
        if (mobileMenu.style.display === 'block') {
            mobileMenu.style.display = 'none';
        } else {
            mobileMenu.style.display = 'block';
        }
    });

    const mobileMenuItems = mobileMenu.querySelectorAll('a');
    mobileMenuItems.forEach(function (item) {
        item.addEventListener('click', function () {
            mobileMenu.style.display = 'none';
        });
    });

    document.addEventListener('click', function (event) {
        if (!menuToggle.contains(event.target) && !mobileMenu.contains(event.target)) {
            mobileMenu.style.display = 'none';
        }
    });
    
});

document.addEventListener('DOMContentLoaded', function () {
    fetch('/auth/volunteers')
        .then(response => response.json())
        .then(data => {
            console.log(data); 
            const container = document.getElementById('Container');

            // Build the table dynamically with the header and rows combined
            let tableHTML = `
                <div class="w-full h-full max-h-[37rem] overflow-y-auto rounded-lg  shadow-black shadow-lg">
                    <table id="myTable2" class="text-start   w-full px-4">
                        <thead class="font-Inter md:font-[100] text-[#5B5B5B] md:text-2xl md:mx-0 md:h-16">
                            <tr>
                                <th class="text-start pl-5">Volunteers</th>
                                <th class="text-center">Points</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm md:text-xl text-start font-Inter">
            `;

            // Loop through the data and create table rows dynamically
            data.forEach((volunteer, index) => {
                tableHTML += `
                    <tr class="h-7 border-t-2 border-b-[1px] hover:bg-gray-300 border-gray-500 md:h-16 cursor-pointer" onclick="showDutyDetails(${volunteer.id})">
                        <td class="pl-5 flex justify-normal space-x-3 pt-4">
                            <p class="text-2xl font-bold">${index + 1}.</p>
                            <p>${volunteer.name}</p>
                        </td>
                        <td class="text-center">${volunteer.points}</td>
                    </tr>
                `;
            });
            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHTML;
        })
        .catch(error => console.error('Error fetching data:', error));
});

function showDutyDetails(volunteerId) {
    fetch(`/auth/volunteer/${volunteerId}`)
        .then(response => response.json())
        .then(volunteerDetails => {
            document.getElementById('dutyhoursdetail').style.display = 'block';

            document.querySelector('#detailName').textContent = volunteerDetails.name;
            document.querySelector('#detailID').textContent = volunteerDetails.id;
            document.querySelector('#dutyHours').textContent = volunteerDetails.dutyHours;
            document.querySelector('#fireResponse').textContent = volunteerDetails.fireResponsePoints;
            document.querySelector('#inventory').textContent = volunteerDetails.inventoryPoints;
            document.querySelector('#activity').textContent = volunteerDetails.activityPoints;
        })
        .catch(error => console.error('Error fetching details:', error));
}

function exitdtdetail() {
    document.getElementById('dutyhoursdetail').style.display = 'none';
}


document.addEventListener('DOMContentLoaded', function () {
    fetch('/auth/fireresponse')
        .then(response => response.json())
        .then(data => {
            console.log(data); 
            const container = document.getElementById('Container2');

            // Build the table dynamically with the header and rows combined
            let tableHTML = `
                <div class="w-full h-full max-h-[37rem] overflow-y-auto rounded-lg shadow-black shadow-lg">
                    <table id="myTable3" class="text-start   w-full px-4">
                        <thead class="font-Inter md:font-[100] text-[#5B5B5B] md:text-2xl md:mx-0 md:h-16">
                            <tr>
                                <th class="text-start pl-5">Volunteers</th>
                                <th class="text-center">Fire Response</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm md:text-xl text-start font-Inter">
            `;

            // Loop through the data and create table rows dynamically
            data.forEach((volunteer, index) => {
                tableHTML += `
                    <tr class="h-7 border-t-2 border-b-[1px] hover:bg-gray-300 border-gray-500 md:h-16 cursor-pointer" onclick="showFireRe(${volunteer.id})">
                        <td class="pl-5 flex justify-normal space-x-3 pt-4">
                            <p class="text-2xl font-bold">${index + 1}.</p>
                            <p>${volunteer.name}</p>
                        </td>
                        <td class="text-center">${volunteer.points}</td>
                    </tr>
                `;
            });
            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHTML;
        })
        .catch(error => console.error('Error fetching data:', error));
});

function showFireRe(volunteerId) {
    fetch(`/auth/fireresponse/${volunteerId}`)
        .then(response => response.json())
        .then(volunteerDetails => {
            document.getElementById('frdetail').style.display = 'block';

            document.querySelector('#detailName2').textContent = volunteerDetails.name;
            document.querySelector('#detailID2').textContent = volunteerDetails.id;
            document.querySelector('#dutyHours2').textContent = volunteerDetails.dutyHours;
            document.querySelector('#fireResponse2').textContent = volunteerDetails.fireResponsePoints;
            document.querySelector('#inventory2').textContent = volunteerDetails.inventoryPoints;
            document.querySelector('#activity2').textContent = volunteerDetails.activityPoints;
        })
        .catch(error => console.error('Error fetching details:', error));
}

function exitdtdetail2() {
    document.getElementById('frdetail').style.display = 'none';
}