@description('Short prefix used for Azure resource names.')
param prefix string = 'londontube'

@description('Azure region for the deployment.')
param location string = resourceGroup().location

@description('App Service plan SKU. Use B1 or higher so Always On can stay enabled for Socket.io stability.')
param appServicePlanSku string = 'B1'

@description('Node.js runtime stack for the Linux Web App.')
param nodeRuntime string = 'NODE|24-lts'

var appServicePlanName = '${prefix}-plan'
var webAppName = '${prefix}-web'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServicePlanSku
    tier: startsWith(appServicePlanSku, 'B') ? 'Basic' : startsWith(appServicePlanSku, 'S') ? 'Standard' : 'PremiumV3'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: nodeRuntime
      alwaysOn: true
      webSocketsEnabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
      ]
    }
  }
}

output webAppName string = webApp.name
output defaultHostName string = webApp.properties.defaultHostName