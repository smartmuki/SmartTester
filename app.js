var xml2js = require('xml2js')
	, fs = require('fs')
	, mongoose = require('mongoose');

var testSchema = new mongoose.Schema({
	name: String,
	lastRunTime: Date,
	outcome: String,
	duration: String
});

mongoose.model('test', testSchema);
var TestMongoose = mongoose.model('test');

var pathToTrx = __dirname + '/TrxDumps';
var pathToLastAccessedFile = __dirname + '/LastAccessedTime.json';
var patterns = [
            /Waiting for element: ([a-zA-Z0-9-_/+]+) to be visible. ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Getting Element: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Getting Elements: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Getting text of element: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Checking if element is visible: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Getting number of children of element: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /. ElementId: ([a-zA-Z0-9-_/+]+). Operand: ([a-zA-Z0-9-_/+]+)/,
            /Waiting on Element: ([a-zA-Z0-9-_/+]+). ElementSelection: ([a-zA-Z0-9-_/+]+)/,
            /Executing jquery: ([\w\W]+)/
];
	
var parser =  new xml2js.Parser();

fs.readFile(pathToLastAccessedFile, function(err, data) {
	var parsedData = JSON.parse(data);
	var lastAccessedTime = parsedData.LastAccessedTime;
	fs.readdir(pathToTrx, function(err, files) {
		files.forEach(function(fileName){
			fs.stat(pathToTrx + '/' + fileName, function(err, stats) {
				var fileCreatedTime = stats.birthtime.getTime();
				console.log('stats: ' + fileCreatedTime);
				if(fileCreatedTime > lastAccessedTime) {
					// This file has not been processed yet.
					
					fs.readFile(pathToTrx + '/' + fileName, function(err, data) {
						parser.parseString(data, function(err, result) {
							var testResults = result.TestRun.Results[0].UnitTestResult;
							testResults.forEach(function(testResult){
								var test = testResult.$;
																															
								var testModel = new TestMongoose();
								testModel.name = test.testName;
								testModel.outcome = test.outcome;
								testModel.lastRunTime = test.startTime;
								testModel.duration = test.duration; 

								mongoose.connect('mongodb://localhost/smartTester');  
								testModel.save(function(err, savedInfo){ 
									console.log(TestMongoose.find());
									mongoose.disconnect();
								});
								
								
								var output = testResult.Output[0].StdOut[0];
								var lines = output.split('\n');
								console.log(lines.length);
								lines.forEach(function(line) {
									patterns.forEach(function(pattern){
										// todo
									});
								});
								
								
							});
						});					
					});
									
					// update the timestamp in lastaccessedtime.json
					// note: NOT THREAD SAFE
//					fs.readFile(pathToLastAccessedFile, function(err, data) {
//						var parsedLatestData = JSON.parse(data);
//						if(parsedLatestData.LastAccessedTime < fileCreatedTime) {
//							parsedLatestData.LastAccessedTime = fileCreatedTime;
//							fs.writeFile(pathToLastAccessedFile, JSON.stringify(parsedLatestData));
//						}
//					});
//					
					
				}
			});
		});
	});
});

