<script setup>
import * as Network from "@/network";
import * as Const from "@/network/const";

const ivData = ref([]);
const addOnData = ref([]);
const injectableData = ref([]);
const othersData = ref([]);

const getSalesMetrics = (value) => {
  Network.getRequest(Const.GET_SALES_METRICS, {}, {}, 
    (response) => {
      if(response.data.success){
        ivData.value = response.data.data['iv therapy'];
        addOnData.value = response.data.data.add_on;
        injectableData.value = response.data.data.injectables;
        othersData.value = response.data.data.other;
      }else{
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
}

onMounted(()=>{
  getSalesMetrics();
});
</script>

<template>
  <VCard title="SALES METRICS">
    <VCardText class="mb-2">
      <VTable class="text-no-wrap border rounded mb-4">
        <thead>
          <tr>
            <th scope="col">
              <h2 class="text-primary">IV Therapy</h2>
            </th>
            <th scope="col">
              <h2 class="text-primary">Visits</h2>
            </th>
            <th scope="col">
              <h2 class="text-primary">Goal</h2>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total:</td>
            <td>{{ ivData?.total?.count }}</td>
            <td>${{ ivData?.total?.amount }}</td>
          </tr>
          <tr>
            <td>Daily:</td>
            <td>{{ ivData?.daily?.count }}</td>
            <td>${{ ivData?.daily?.amount }}</td>
          </tr>
          <tr>
            <td>Weekly:</td>
            <td>{{ ivData?.weekly?.count }}</td>
            <td>${{ ivData?.weekly?.amount }}</td>
          </tr>
          <tr>
            <td>Monthly:</td>
            <td>{{ ivData?.monthly?.count }}</td>
            <td>${{ ivData?.monthly?.amount }}</td>
          </tr>
        </tbody>
      </VTable>

      <VTable class="text-no-wrap border rounded mb-4">
        <thead>
          <tr>
            <th scope="col">
              <h2 class="text-primary">INJECTABLE</h2>
            </th>
            <th scope="col">
              <h2 class="text-primary">Visits</h2>
            </th>
            <th scope="col">
              <h2 class="text-primary">Goal</h2>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total:</td>
            <td>{{ injectableData?.total?.count }}</td>
            <td>${{ injectableData?.total?.amount }}</td>
          </tr>
          <tr>
            <td>Daily:</td>
            <td>{{ injectableData?.daily?.count }}</td>
            <td>${{ injectableData?.daily?.amount }}</td>
          </tr>
          <tr>
            <td>Weekly:</td>
            <td>{{ injectableData?.weekly?.count }}</td>
            <td>${{ injectableData?.weekly?.amount }}</td>
          </tr>
          <tr>
            <td>Monthly:</td>
            <td>{{ injectableData?.monthly?.count }}</td>
            <td>${{ injectableData?.monthly?.amount }}</td>
          </tr>
        </tbody>
      </VTable>

      <VTable class="text-no-wrap border rounded mb-4">
        <thead>
          <tr>
            <th scope="col">
              <h2 class="text-primary">OTHERS</h2>
            </th>
            <th scope="col">
              <h2 class="text-primary">Visits</h2>
            </th>
            <th scope="col">
              <h2 class="text-primary">Goal</h2>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total:</td>
            <td>{{ othersData?.total?.count }}</td>
            <td>${{ othersData?.total?.amount }}</td>
          </tr>
          <tr>
            <td>Daily:</td>
            <td>{{ othersData?.daily?.count }}</td>
            <td>${{ othersData?.daily?.amount }}</td>
          </tr>
          <tr>
            <td>Weekly:</td>
            <td>{{ othersData?.weekly?.count }}</td>
            <td>${{ othersData?.weekly?.amount }}</td>
          </tr>
          <tr>
            <td>Monthly:</td>
            <td>{{ othersData?.monthly?.count }}</td>
            <td>${{ othersData?.monthly?.amount }}</td>
          </tr>
        </tbody>
      </VTable>

      <VTable class="text-no-wrap border rounded mb-4">
        <thead>
          <tr>
            <th scope="col">
              <h2 class="text-primary">ADD ON</h2>
            </th>
            <th scope="col">
              <h2 class="text-primary">Visits</h2>
            </th>
            <th scope="col">
              <h2 class="text-primary">Goal</h2>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total:</td>
            <td>{{ addOnData?.total?.count }}</td>
            <td>${{ addOnData?.total?.amount }}</td>
          </tr>
          <tr>
            <td>Daily:</td>
            <td>{{ addOnData?.daily?.count }}</td>
            <td>${{ addOnData?.daily?.amount }}</td>
          </tr>
          <tr>
            <td>Weekly:</td>
            <td>{{ addOnData?.weekly?.count }}</td>
            <td>${{ addOnData?.weekly?.amount }}</td>
          </tr>
          <tr>
            <td>Monthly:</td>
            <td>{{ addOnData?.monthly?.count }}</td>
            <td>${{ addOnData?.monthly?.amount }}</td>
          </tr>
        </tbody>
      </VTable>
      
    </VCardText>
  </VCard>
</template>
