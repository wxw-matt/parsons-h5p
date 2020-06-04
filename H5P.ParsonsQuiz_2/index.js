var H5P = H5P || {};

H5P.ParsonsQuiz = (function($, ParsonsJS) {
    function displayErrors(fb) {
        if (fb.errors.length > 0) {
            alert(fb.errors[0]);
        }
    }

    /**
     * StepByStepMath constructor
     * @param       {object} options Object with current data and configurations
     * @param       {integer} id      Unique identifier
     * @constructor
     */
    function ParsonsQuiz(options, id, data) {
        // Inheritance
        // Question.call(self, 'parsons');
        this.data = data;
        var defaults = {
            passPercentage: 50,
            texts: {
                finishButton: 'Finish'
            },
            endGame: {
                showResultPage: true,
                noResultMessage: 'Finished',
                message: 'Your result:',
                oldFeedback: {
                    successGreeting: '',
                    successComment: '',
                    failGreeting: '',
                    failComment: ''
                },
                overallFeedback: [],
                finishButtonText: 'Finish',
                solutionButtonText: 'Show solution'
            },
            override: {},
            disableBackwardsNavigation: false
        };
        this.options = $.extend(true, {}, defaults, options); // defined in semantics.json
        this.parsonList = [];
        this.id = id;
        // this.quiz = this.options.quiz;
        this.$startQ = $('<button/>', { 'class': "startQuiz", 'text': "start Quiz ?" });
        this.$inner = $('<div/>', {
            class: "h5p-inner"
        });
        this.$endQ = $('<button/>', { 'class': "endQuiz", 'text': "submit Quiz " });

        //score create
        this.score = 0;
        this.Maxscore = 0;

        /* this is the part for get random question to the student */
        this.questionInstances = [];
        this.questionOrder; //Stores order of questions to allow resuming of question set
        /**
         * Randomizes questions in an array and updates an array containing their order
         * @param  {array} problems
         * @return {Object.<array, array>} questionOrdering
         */
        this.randomizeQuestionOrdering = function(questions) {

            // Save the original order of the questions in a multidimensional array [[question0,0],[question1,1]...
            var questionOrdering = questions.map(function(questionInstance, index) {
                return [questionInstance, index];
            });

            // Shuffle the multidimensional array
            questionOrdering = H5P.shuffleArray(questionOrdering);

            // Retrieve question objects from the first index
            questions = [];
            for (var i = 0; i < questionOrdering.length; i++) {
                questions[i] = questionOrdering[i][0];
            }

            // Retrieve the new shuffled order from the second index
            var newOrder = [];
            for (var j = 0; j < questionOrdering.length; j++) {

                // Use a previous order if it exists
                if (data.previousState && data.previousState.questionOrder) {
                    newOrder[j] = questionOrder[questionOrdering[j][1]];
                } else {
                    newOrder[j] = questionOrdering[j][1];
                }
            }

            // Return the questions in their new order *with* their new indexes
            return {
                questions: questions,
                questionOrder: newOrder
            };
        };
        /**add templates  */
        this.addTemplate = function() {
            var resulttemplate =
                '<div class="questionset-results">' +
                '  <div class="greeting"><%= message %></div>' +
                '  <div class="feedback-section">' +
                '    <div class="feedback-scorebar"></div>' +
                '    <div class="feedback-text"></div>' +
                '  </div>' +
                '  <% if (comment) { %>' +
                '  <div class="result-header"><%= comment %></div>' +
                '  <% } %>' +
                '  <% if (resulttext) { %>' +
                '  <div class="result-text"><%= resulttext %></div>' +
                '  <% } %>' +
                // '  <div class="buttons">' +
                // solutionButtonTemplate +
                // retryButtonTemplate +
                // '  </div>' +
                '</div>';
            this.endTemplate = new EJS({ text: resulttemplate });
        }
        this.finals;
        this.totals;
        this.scoreString = "";
        this.success;
        this.scoreBar;
        this.addTemplate();
    }

    /**
     * Creates and fills container with content
     * @param  {object} $container Container node
     * @return {void}
     */

    ParsonsQuiz.prototype.attach = function($container) {
        var self = this;

        // set container
        self.$container = $container;
        $container.addClass('h5p-parsons');
        self.$inner.appendTo($container);
        self.$startQ.appendTo($container);
        /** add start timmer */
        self.$inner.hide();
        var startTotal;
        var finishTotal;
        $(".startQuiz").click(function() {
            self.$startQ.hide();
            self.$inner.show();
            startTotal = new Date();
            console.log(startTotal);
        });

        /**end timer */


        /** start shuffle question order */
        // Bring question set up to date when resuming
        if (this.data.previousState) {
            if (this.data.previousState.progress) {
                currentQuestion = this.data.previousState.progress;
            }
            questionOrder = this.data.previousState.order;
        }

        // Create a pool (a subset) of questions if necessary
        if (this.options.poolSize > 0) {

            // If a previous pool exists, recreate it
            if (this.data.previousState && this.data.previousState.poolOrder) {
                poolOrder = this.data.previousState.poolOrder;

                // Recreate the pool from the saved data
                var pool = [];
                for (var i = 0; i < poolOrder.length; i++) {
                    pool[i] = this.options.quiz[poolOrder[i]];
                    this.questionInstances.push(pool[i]);
                }
                // Replace original questions with just the ones in the pool
                this.options.quiz = pool;

            } else { // Otherwise create a new pool
                // Randomize and get the results
                var poolResult = this.randomizeQuestionOrdering(this.options.quiz);
                var poolQuestions = poolResult.questions;
                poolOrder = poolResult.questionOrder;

                // Discard extra questions

                poolQuestions = poolQuestions.slice(0, this.options.poolSize);
                poolOrder = poolOrder.slice(0, this.options.poolSize);
                // Replace original questions with just the ones in the pool
                this.options.quiz = poolQuestions;

            }

        }
        // add quiz title and description
        $('<div/>', { "text": this.data.metadata.title, "id": "title" }).appendTo(self.$inner);
        $('<p/>', { html: this.options.assignmentDescription, "id": "taskDescription" }).appendTo(self.$inner);

        // add each question to quiz
        for (let i = 0; i < this.options.quiz.length; i++) {
            var problem = this.options.quiz[i];
            var parsonsjs = new ParsonsJS(i);
            // add each question's container
            self.$inner.append(parsonsjs.$question);

            // create a new parson question
            var problem_title = problem.problem_title;
            var problem_description = problem.problem_description;
            var problemIndex = i + 1;

            // add meta data of the question
            $("<h2/>", { "class": "problemTitle", "text": "Question " + problemIndex + ": " + problem_title }).appendTo(parsonsjs.$question);
            $("<p/>", { "class": "problemDescription", "text": problem_description }).appendTo(parsonsjs.$question);
            $("<p/>", { "class": "codeLanguage", "id": "language-" + i, "text": problem.code.code_language }).appendTo(parsonsjs.$question);
            $("#language-" + i).prepend($("<i class= 'fas fa-globe-asia'> language:  </i> "));
            $("<div/>", { "class": "sortable-code", "id": "sortableTrash" }).appendTo(parsonsjs.$question);
            $("<div/>", { "class": "sortable-code", "id": "sortable" }).appendTo(parsonsjs.$question);
            $("<div/>", { "css": "clear:both;" }).appendTo(parsonsjs.$question);
            $('<div/>', { "id": "unittest" }).appendTo(parsonsjs.$question);
            // 
            // question content
            var code_line = problem.code.code_block;
            self.Maxscore += 1;
            var parson = new ParsonsJS.ParsonsWidget({
                // 'sortableId': 'sortable',
                // 'trashId': 'sortableTrash',
                // 'max_wrong_lines': problem.code.max_wrong_lines,
                // 'feedback_cb': displayErrors
                'sortableId': 'sortable',
                'trashId': 'sortableTrash',
                'max_wrong_lines': 1,
                'vartests': [{ initcode: "min = None\na = 0\nb = 2", code: "", message: "Testing with a = 0 ja b = 2", variables: { min: 0 } },
                    {
                        initcode: "min = None\na = 7\nb = 4\n",
                        code: "",
                        message: "Testing with a = 7 ja b = 4",
                        variables: { min: 4 }
                    }
                ],
                'grader': ParsonsJS.ParsonsWidget._graders.LanguageTranslationGrader,
                'executable_code': "if $$toggle$$ $$toggle::<::>::!=$$ b:\n" +
                    "min = a\n" +
                    "else:\n" +
                    "min = b\n  pass",
                'programmingLang': "pseudo"
            });

            self.parsonList.push(parson);


            parson.init(code_line);
            parson.shuffleLines();

            // newInstance and feedback buttons
            $("<div/>", { "style": "clear:both;" }).appendTo(parsonsjs.$question);
            parsonsjs.$question.append($("<p/>", { 'id': "buttons" }));
            $("<a/>", { "class": "instance", "href": "#", "id": "newInstanceLink-" + i, "text": "New instance" }).appendTo(parsonsjs.$question.find("#buttons"));
            $("<a/>", { "class": "feedback", "href": "#", "id": "feedbackLink-" + i, "text": "Get feedback" }).appendTo(parsonsjs.$question.find("#buttons"));
        }
        $(".instance").on('click', function(event) {
            var currentId = $(this).attr('id');
            var currentIndex = currentId.substr(currentId.length - 1);
            event.preventDefault();
            self.parsonList[currentIndex].shuffleLines();
        });
        $(".feedback").on('click', function(event) {
            var currentId = $(this).attr('id');
            var currentIndex = currentId.substr(currentId.length - 1);
            console.log("feedback : " + currentIndex + "is ongoing");
            event.preventDefault();
            var fb = self.parsonList[currentIndex].getFeedback();
            if (self.parsonList[currentIndex].correct == true) {
                self.score += 1;
            }
            if (fb.success) { alert("Good, you solved the assignment!"); }
        });
        //submit button to submit the quiz form
        self.$endQ.appendTo(self.$inner);
        $(".endQuiz").click(function() {
            finishTotal = new Date() - startTotal;
            // console.log(finishTotal);
            /**attach result page */
            // Trigger finished event.
            self.finals = self.score;
            self.totals = self.Maxscore;
            self.success = ((100 * self.finals / self.totals) >= self.options.passPercentage);

            // console.log(self.success);
            self.scoreString = H5P.Question.determineOverallFeedback(self.options.endGame.overallFeedback, self.finals / self.totals);

            self.displayResults();
            self.trigger('resize');
            /**end attach result page */
        });
        /**start display result setting */
        self.displayResults = function() {
            this.triggerXAPICompleted(this.finals, this.totals, this.success);

            var eparams = {
                message: this.options.endGame.showResultPage ? this.options.endGame.message : this.options.endGame.noResultMessage,
                comment: this.options.endGame.showResultPage ? (this.success ? this.options.endGame.oldFeedback.successGreeting : this.options.endGame.oldFeedback.failGreeting) : undefined,
                resulttext: this.options.endGame.showResultPage ? (this.success ? this.options.endGame.oldFeedback.successComment : this.options.endGame.oldFeedback.failComment) : undefined,
                finishButtonText: this.options.endGame.finishButtonText,
            };

            // Show result page.
            this.$container.children().hide();
            this.$container.append(this.endTemplate.render(eparams));

            if (this.options.endGame.showResultPage) {
                scoreBar = this.scoreBar;
                if (scoreBar === undefined) {
                    scoreBar = H5P.JoubelUI.createScoreBar(this.totals);
                }
                scoreBar.appendTo($('.feedback-scorebar', this.$container));
                $('.feedback-text', this.$container).html(this.scoreString);

                // Announce that the question set is complete
                setTimeout(function() {
                    console.log(self.totals);
                    console.log(self.finals);
                    $('.qs-progress-announcer', this.$container)
                        .html(eparams.message + '.' +
                            this.scoreString + '.' +
                            eparams.comment + '.' +
                            eparams.resulttext)
                        .show().focus();
                    scoreBar.setMaxScore(self.totals);
                    scoreBar.setScore(self.finals);
                }, 0);
            } else {
                // Remove buttons and feedback section
                $('.feedback-section', this.$container).remove();
            }

            this.trigger('resize');
        };
        /**end display result setting */

    }



    return ParsonsQuiz;

})(H5P.jQuery, H5P.ParsonsJS);