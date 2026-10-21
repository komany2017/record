<template>
  <div class="water-page">
    <header class="page-header">
      <button type="button" class="back" @click="$router.back()">‹</button>
      <h1>喝水记录</h1>
      <span class="spacer"></span>
    </header>
    <WaterIntakeView />
  </div>
</template>

<script>
import WaterIntakeView from './components/WaterIntakeView.vue';

export default {
  name: 'WaterPage',
  components: { WaterIntakeView }
};
</script>

<style scoped>
.water-page {
  min-height: 100vh;
  background-color: #f4f5f7;
  padding-bottom: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 12px 12px;
  border-bottom: 1px solid #f0f2f5;
}

.page-header h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1f2430;
}

.back,
.spacer {
  width: 34px;
  border: none;
  background: none;
  color: #4a5160;
  font-size: 22px;
  padding: 0;
  text-align: left;
}
</style>
